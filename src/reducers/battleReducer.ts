/**
 * Turn-by-turn battle state machine.
 *
 * Owns phase transitions (player_turn → resolving → opponent_turn → player_turn)
 * and HP/MP mutations during a fight. Move effect logic (heal, damage, leech,
 * DoT, stun, shield) lives in src/utils/moveEffects.ts.
 *
 * Phase flow:
 *   player acts  →  resolving  →  opponent acts  →  TICK_RESOLVE  →  player_turn
 *                                       └── victory / defeat checked after each action and after ticks
 */

import type { BattleState, BattleLogEntry, ActiveEffect, Move, ElementType } from '../types';
import { calcMoveEffect } from '../utils/damage';
import { BASIC_ATTACK } from '../data/moves';
import { applyMoveEffects, mkLog, sumShield, statusLabel, type MoveContext } from '../utils/specialMoveEffects';

const ELEMENT_ORDER: ElementType[] = [
  'normal', 'fire', 'water', 'electric', 'grass',
  'ice', 'poison', 'earth', 'dark', 'psychic',
];

function getPlayerDefensiveType(stats: Partial<Record<ElementType, number>>): ElementType {
  let best: ElementType = 'normal';
  let bestVal = -1;
  for (const el of ELEMENT_ORDER) {
    const val = stats[el] ?? 0;
    if (val > bestVal) { bestVal = val; best = el; }
  }
  return best;
}

function checkVictory(hp: number): boolean { return hp <= 0; }
function checkDefeat(hp: number): boolean { return hp <= 0; }

interface AttackResult {
  newPlayerHp: number;
  newOpponentHp: number;
  dmg: number;
  logs: BattleLogEntry[];
  activeEffects: ActiveEffect[];
}

function resolveOpponentSpecial(state: BattleState, move: Move): AttackResult {
  const { def } = state.opponent;
  const playerDefType = getPlayerDefensiveType(state.player.stats);

  const ctx = applyMoveEffects(
    {
      casterHp: state.opponent.hp, casterMaxHp: def.maxHp,
      targetHp: state.player.hp, targetMaxHp: state.player.maxHp,
      activeEffects: state.activeEffects, logs: [],
      casterSide: 'opponent', casterName: def.name,
      targetSide: 'player', targetName: 'you',
      move, lastDamageDealt: 0, lastRawEffect: 0,
      attackerBaseDamage: def.baseDamage,
      defenderBaseDefense: state.player.baseDefense,
    } satisfies MoveContext,
    playerDefType,
  );

  return {
    newPlayerHp: ctx.targetHp,
    newOpponentHp: ctx.casterHp,
    dmg: ctx.lastDamageDealt,
    logs: ctx.logs,
    activeEffects: ctx.activeEffects,
  };
}

function resolveOpponentAutoAttack(state: BattleState): AttackResult {
  const { def } = state.opponent;
  const spread = def.baseDamage * def.damageVariance;
  const autoBase = Math.round(def.baseDamage + (Math.random() * spread * 2 - spread));
  // Defense is halved to prevent it from being too dominant; attacker baseDamage already baked into autoBase
  const rawDmg = Math.max(1, autoBase - Math.floor(state.player.baseDefense * 0.5));
  const shield = sumShield(state.activeEffects, 'player');
  const dmg = Math.max(0, rawDmg - shield);

  let msg = `${def.name} attacked you for ${dmg} damage!`;
  if (shield > 0 && rawDmg > 0) msg += ` (your shield absorbed ${Math.min(shield, rawDmg)})`;

  return {
    newPlayerHp: Math.max(0, state.player.hp - dmg),
    newOpponentHp: state.opponent.hp,
    dmg,
    logs: [mkLog(msg, 'opponent')],
    activeEffects: state.activeEffects,
  };
}

export type BattleAction =
  | { type: 'USE_ATTACK' }
  | { type: 'USE_SPECIAL'; slotIndex: 0 | 1 | 2 | 3 }
  | { type: 'OPPONENT_TURN_RESOLVE' }
  | { type: 'TICK_RESOLVE' }
  | { type: 'PLAYER_STUN_SKIP' };

export function battleReducer(state: BattleState, action: BattleAction): BattleState {
  switch (action.type) {

    case 'USE_ATTACK': {
      if (state.phase !== 'player_turn') return state;
      if (state.playerStunned) return state;

      const elementalDmg = calcMoveEffect(BASIC_ATTACK, state.opponent.def.type, state.player.stats);
      const rawDmg = Math.max(1, elementalDmg + state.player.baseDamage - Math.floor(state.opponent.def.baseDefense * 0.5));
      const shield = sumShield(state.activeEffects, 'opponent');
      const dmg = Math.max(0, rawDmg - shield);
      const newOpponentHp = Math.max(0, state.opponent.hp - dmg);
      const isVictory = checkVictory(newOpponentHp);

      let msg = `You attacked for ${dmg} damage!`;
      if (shield > 0 && rawDmg > 0) msg += ` (${state.opponent.def.name}'s shield absorbed ${Math.min(shield, rawDmg)})`;

      return {
        ...state,
        phase: isVictory ? 'victory' : 'resolving',
        opponent: { ...state.opponent, hp: newOpponentHp },
        log: [...state.log, mkLog(msg, 'player')],
        lastPlayerDamage: dmg,
        lastOpponentDamage: null,
        lastAttackElement: BASIC_ATTACK.type,
        lastAttackSide: 'player',
      };
    }

    case 'USE_SPECIAL': {
      if (state.phase !== 'player_turn') return state;
      if (state.playerStunned) return state;

      const move = state.player.moves[action.slotIndex];
      if (!move) return state;
      if (state.player.mp < move.mpCost) return state;

      const ctx = applyMoveEffects(
        {
          casterHp: state.player.hp, casterMaxHp: state.player.maxHp,
          targetHp: state.opponent.hp, targetMaxHp: state.opponent.def.maxHp,
          activeEffects: state.activeEffects, logs: [],
          casterSide: 'player', casterName: 'You',
          targetSide: 'opponent', targetName: state.opponent.def.name,
          move, lastDamageDealt: 0, lastRawEffect: 0,
          attackerBaseDamage: state.player.baseDamage,
          defenderBaseDefense: state.opponent.def.baseDefense,
        } satisfies MoveContext,
        state.opponent.def.type,
        state.player.stats,
      );

      const isVictory = move.baseDamage > 0 && checkVictory(ctx.targetHp);

      const opponentJustStunned = ctx.activeEffects.some(
        e => e.target === 'opponent' && e.stunned && !state.activeEffects.some(prev => prev === e),
      );

      return {
        ...state,
        phase: isVictory ? 'victory' : 'resolving',
        player: { ...state.player, hp: ctx.casterHp, mp: state.player.mp - move.mpCost },
        opponent: { ...state.opponent, hp: ctx.targetHp },
        log: [...state.log, ...ctx.logs],
        activeEffects: ctx.activeEffects,
        opponentStunned: opponentJustStunned ? true : state.opponentStunned,
        lastPlayerDamage: move.baseDamage > 0 ? ctx.lastRawEffect : null,
        lastOpponentDamage: null,
        lastAttackElement: move.type,
        lastAttackSide: 'player',
      };
    }

    case 'OPPONENT_TURN_RESOLVE': {
      if (state.phase !== 'resolving') return state;
      const { def } = state.opponent;

      if (state.opponentStunned) {
        return {
          ...state,
          phase: 'opponent_turn',
          log: [...state.log, mkLog(`${def.name} is stunned and can't act!`, 'system')],
          lastOpponentDamage: null,
          lastPlayerDamage: null,
          lastAttackElement: null,
          lastAttackSide: null,
        };
      }

      const pickedMove: Move | null = def.moves.length > 0
        ? def.moves[Math.floor(Math.random() * def.moves.length)]
        : null;

      const attackResult = pickedMove
        ? resolveOpponentSpecial(state, pickedMove)
        : resolveOpponentAutoAttack(state);

      const isDefeat = checkDefeat(attackResult.newPlayerHp);

      const opponentMovesUsed = pickedMove && !state.opponentMovesUsed.some(m => m.id === pickedMove.id)
        ? [...state.opponentMovesUsed, pickedMove]
        : state.opponentMovesUsed;

      const playerJustStunned = attackResult.activeEffects.some(
        e => e.target === 'player' && e.stunned && !state.activeEffects.some(prev => prev === e),
      );

      return {
        ...state,
        phase: isDefeat ? 'defeat' : 'opponent_turn',
        player: { ...state.player, hp: attackResult.newPlayerHp },
        opponent: { ...state.opponent, hp: attackResult.newOpponentHp },
        log: [...state.log, ...attackResult.logs],
        lastOpponentDamage: attackResult.dmg,
        lastPlayerDamage: null,
        lastAttackElement: pickedMove ? pickedMove.type : def.type,
        lastAttackSide: 'opponent',
        opponentMovesUsed,
        activeEffects: attackResult.activeEffects,
        playerStunned: playerJustStunned ? true : state.playerStunned,
      };
    }

    case 'TICK_RESOLVE': {
      if (state.phase !== 'opponent_turn') return state;

      const newLogs: BattleLogEntry[] = [];
      let newPlayerHp = state.player.hp;
      let newPlayerMp = state.player.mp;
      let newOpponentHp = state.opponent.hp;
      const remainingEffects: ActiveEffect[] = [];
      let nextPlayerStunned = false;
      let nextOpponentStunned = false;

      for (const eff of state.activeEffects) {
        if (eff.damage > 0) {
          if (eff.target === 'player') {
            newPlayerHp = Math.max(0, newPlayerHp - eff.damage);
            newLogs.push(mkLog(`You were ${statusLabel(eff.sourceType)} for ${eff.damage} damage!`, 'system'));
          } else {
            newOpponentHp = Math.max(0, newOpponentHp - eff.damage);
            newLogs.push(mkLog(`${state.opponent.def.name} was ${statusLabel(eff.sourceType)} for ${eff.damage} damage!`, 'system'));
          }
        }

        if (eff.stunned && !eff.skipFirstTick) {
          if (eff.target === 'player') nextPlayerStunned = true;
          else nextOpponentStunned = true;
        }

        if (eff.skipFirstTick) {
          remainingEffects.push({ ...eff, skipFirstTick: false });
        } else {
          const newTurnsLeft = eff.turnsLeft - 1;
          if (newTurnsLeft > 0) {
            remainingEffects.push({ ...eff, turnsLeft: newTurnsLeft });
          } else if (eff.defense > 0) {
            newLogs.push(mkLog(
              `${eff.target === 'player' ? 'Your' : `${state.opponent.def.name}'s`} ${eff.sourceName} shield faded!`,
              'system',
            ));
          }
        }
      }

      if (state.hpRegenPerTurn > 0 && newPlayerHp > 0) {
        const healed = Math.min(state.hpRegenPerTurn, state.player.maxHp - newPlayerHp);
        if (healed > 0) {
          newPlayerHp += healed;
          newLogs.push(mkLog(`You regenerated ${healed} HP.`, 'system'));
        }
      }
      if (state.mpRegenPerTurn > 0) {
        const restored = Math.min(state.mpRegenPerTurn, state.player.maxMp - newPlayerMp);
        if (restored > 0) {
          newPlayerMp += restored;
          newLogs.push(mkLog(`You recovered ${restored} MP.`, 'system'));
        }
      }

      const isVictory = checkVictory(newOpponentHp);
      const isDefeat = !isVictory && checkDefeat(newPlayerHp);

      return {
        ...state,
        phase: isVictory ? 'victory' : isDefeat ? 'defeat' : 'player_turn',
        turn: state.turn + 1,
        player: { ...state.player, hp: newPlayerHp, mp: newPlayerMp },
        opponent: { ...state.opponent, hp: newOpponentHp },
        log: [...state.log, ...newLogs],
        lastPlayerDamage: null,
        lastOpponentDamage: null,
        lastAttackElement: null,
        lastAttackSide: null,
        activeEffects: remainingEffects,
        playerStunned: nextPlayerStunned,
        opponentStunned: nextOpponentStunned,
      };
    }

    case 'PLAYER_STUN_SKIP': {
      if (state.phase !== 'player_turn' || !state.playerStunned) return state;
      return {
        ...state,
        phase: 'resolving',
        log: [...state.log, mkLog(`You are stunned and can't act!`, 'system')],
        playerStunned: false,
        lastPlayerDamage: null,
        lastOpponentDamage: null,
        lastAttackElement: null,
        lastAttackSide: null,
      };
    }

    default:
      return state;
  }
}
