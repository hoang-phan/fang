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

import type { BattleState, BattleLogEntry, ActiveEffect, Move } from '../types';
import { calcMoveEffect } from '../utils/damage';
import { BASIC_ATTACK } from '../data/moves';
import {
  applyMoveEffects, mkLog, sumShield, statusLabel,
  getAttackAllBoost, getAttackElementBoost, getDefenseBoostPct, getEvasionPct,
  getHpRegenBoostPct, getMpRegenBoostPct,
  type MoveContext,
} from '../utils/specialMoveEffects';
import { getPlayerDefensiveType } from '../utils/xp';

function checkVictory(hp: number): boolean { return hp <= 0; }
function checkDefeat(hp: number): boolean { return hp <= 0; }

interface AttackResult {
  newPlayerHp: number;
  newOpponentHp: number;
  dmg: number;
  logs: BattleLogEntry[];
  activeEffects: ActiveEffect[];
  evaded?: boolean;
}

function resolveOpponentSpecial(state: BattleState, move: Move): AttackResult {
  const { def } = state.opponent;
  const playerDefType = getPlayerDefensiveType(state.player.stats);

  // Player evasion check (only for damage moves)
  if (move.baseDamage > 0) {
    const playerEvasion = getEvasionPct(state.activeEffects, 'player');
    if (playerEvasion > 0 && Math.random() * 100 < playerEvasion) {
      return {
        newPlayerHp: state.player.hp,
        newOpponentHp: state.opponent.hp,
        dmg: 0,
        logs: [mkLog(`You evaded ${def.name}'s ${move.name}!`, 'system')],
        activeEffects: state.activeEffects,
        evaded: true,
      };
    }
  }

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
      attackAllMult: getAttackAllBoost(state.activeEffects, 'opponent'),
      attackElemMult: getAttackElementBoost(state.activeEffects, 'opponent', move.type),
      defenderDefBoostPct: getDefenseBoostPct(state.activeEffects, 'player'),
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

  // Player evasion check for auto-attack
  const playerEvasion = getEvasionPct(state.activeEffects, 'player');
  if (playerEvasion > 0 && Math.random() * 100 < playerEvasion) {
    return {
      newPlayerHp: state.player.hp,
      newOpponentHp: state.opponent.hp,
      dmg: 0,
      logs: [mkLog(`You evaded ${def.name}'s attack!`, 'system')],
      activeEffects: state.activeEffects,
      evaded: true,
    };
  }

  const spread = def.baseDamage * def.damageVariance;
  const autoBase = Math.round(def.baseDamage + (Math.random() * spread * 2 - spread));
  const attackAllMult = getAttackAllBoost(state.activeEffects, 'opponent');
  const defBoostPct = getDefenseBoostPct(state.activeEffects, 'player');
  const boostedPlayerDefense = state.player.baseDefense * (1 + defBoostPct / 100);
  // Defense is halved to prevent it from being too dominant; attacker baseDamage already baked into autoBase
  const rawDmg = Math.max(1, Math.round(autoBase * attackAllMult - Math.floor(boostedPlayerDefense * 0.5)));
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
  | { type: 'PLAYER_STUN_SKIP' }
  | { type: 'P2_USE_ATTACK' }
  | { type: 'P2_USE_SPECIAL'; slotIndex: 0 | 1 | 2 | 3 }
  | { type: 'P2_STUN_SKIP' }
  | { type: 'P2_READY' }; // dismiss handoff interstitial and enter p2_turn

export function battleReducer(state: BattleState, action: BattleAction): BattleState {
  switch (action.type) {

    case 'USE_ATTACK': {
      if (state.phase !== 'player_turn') return state;
      if (state.playerStunned) return state;

      // Check if opponent evades this attack
      const opponentEvasion = getEvasionPct(state.activeEffects, 'opponent');
      if (opponentEvasion > 0 && Math.random() * 100 < opponentEvasion) {
        return {
          ...state,
          phase: 'resolving',
          log: [...state.log, mkLog(`${state.opponent.def.name} evaded your attack!`, 'system')],
          lastPlayerDamage: null,
          lastOpponentDamage: null,
          lastAttackElement: BASIC_ATTACK.type,
          lastAttackSide: 'player',
        };
      }

      const attackAllMult = getAttackAllBoost(state.activeEffects, 'player');
      const defBoostPct = getDefenseBoostPct(state.activeEffects, 'opponent');
      const boostedDefense = state.opponent.def.baseDefense * (1 + defBoostPct / 100);

      const elementalDmg = calcMoveEffect(BASIC_ATTACK, state.opponent.def.type, state.player.stats);
      const rawDmg = Math.max(1, Math.round((elementalDmg + state.player.baseDamage) * attackAllMult - Math.floor(boostedDefense * 0.5)));
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

      // Check if opponent evades this attack (only applies to damage moves)
      if (move.baseDamage > 0) {
        const opponentEvasion = getEvasionPct(state.activeEffects, 'opponent');
        if (opponentEvasion > 0 && Math.random() * 100 < opponentEvasion) {
          return {
            ...state,
            phase: 'resolving',
            player: { ...state.player, mp: state.player.mp - move.mpCost },
            log: [...state.log, mkLog(`${state.opponent.def.name} evaded your ${move.name}!`, 'system')],
            lastPlayerDamage: null,
            lastOpponentDamage: null,
            lastAttackElement: move.type,
            lastAttackSide: 'player',
          };
        }
      }

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
          attackAllMult: getAttackAllBoost(state.activeEffects, 'player'),
          attackElemMult: getAttackElementBoost(state.activeEffects, 'player', move.type),
          defenderDefBoostPct: getDefenseBoostPct(state.activeEffects, 'opponent'),
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

      // In PvP mode, P1 just acted — transition to handoff instead of running AI
      if (state.mode === 'pvp') {
        return {
          ...state,
          phase: 'handoff',
          lastPlayerDamage: null,
          lastOpponentDamage: null,
          lastAttackElement: null,
          lastAttackSide: null,
        };
      }

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

    case 'P2_READY': {
      if (state.phase !== 'handoff') return state;
      if (state.player2Stunned) {
        return {
          ...state,
          phase: 'opponent_turn',
          log: [...state.log, mkLog(`${state.player2?.name ?? 'Player 2'} is stunned and can't act!`, 'system')],
          player2Stunned: false,
        };
      }
      return { ...state, phase: 'p2_turn' };
    }

    case 'P2_USE_ATTACK': {
      if (state.phase !== 'p2_turn' || !state.player2) return state;
      if (state.player2Stunned) return state;

      const p2 = state.player2;

      const opponentEvasion = getEvasionPct(state.activeEffects, 'player');
      if (opponentEvasion > 0 && Math.random() * 100 < opponentEvasion) {
        return {
          ...state,
          phase: 'opponent_turn',
          log: [...state.log, mkLog(`${state.player.name} evaded ${p2.name}'s attack!`, 'system')],
          lastPlayerDamage: null,
          lastOpponentDamage: null,
          lastAttackElement: BASIC_ATTACK.type,
          lastAttackSide: 'opponent',
        };
      }

      const attackAllMult = getAttackAllBoost(state.activeEffects, 'opponent');
      const defBoostPct = getDefenseBoostPct(state.activeEffects, 'player');
      const boostedP1Defense = state.player.baseDefense * (1 + defBoostPct / 100);

      const elementalDmg = calcMoveEffect(BASIC_ATTACK, getPlayerDefensiveType(state.player.stats), p2.stats);
      const rawDmg = Math.max(1, Math.round((elementalDmg + p2.baseDamage) * attackAllMult - Math.floor(boostedP1Defense * 0.5)));
      const shield = sumShield(state.activeEffects, 'player');
      const dmg = Math.max(0, rawDmg - shield);
      const newP1Hp = Math.max(0, state.player.hp - dmg);
      const isDefeat = checkDefeat(newP1Hp);

      let msg = `${p2.name} attacked for ${dmg} damage!`;
      if (shield > 0 && rawDmg > 0) msg += ` (${state.player.name}'s shield absorbed ${Math.min(shield, rawDmg)})`;

      return {
        ...state,
        phase: isDefeat ? 'defeat' : 'opponent_turn',
        player: { ...state.player, hp: newP1Hp },
        opponent: { ...state.opponent, hp: state.player2.hp },
        log: [...state.log, mkLog(msg, 'opponent')],
        lastOpponentDamage: dmg,
        lastPlayerDamage: null,
        lastAttackElement: BASIC_ATTACK.type,
        lastAttackSide: 'opponent',
      };
    }

    case 'P2_USE_SPECIAL': {
      if (state.phase !== 'p2_turn' || !state.player2) return state;
      if (state.player2Stunned) return state;

      const p2 = state.player2;
      const move = p2.moves[action.slotIndex];
      if (!move) return state;
      if (p2.mp < move.mpCost) return state;

      const playerDefType = getPlayerDefensiveType(state.player.stats);

      if (move.baseDamage > 0) {
        const p1Evasion = getEvasionPct(state.activeEffects, 'player');
        if (p1Evasion > 0 && Math.random() * 100 < p1Evasion) {
          return {
            ...state,
            phase: 'opponent_turn',
            player2: { ...p2, mp: p2.mp - move.mpCost },
            log: [...state.log, mkLog(`${state.player.name} evaded ${p2.name}'s ${move.name}!`, 'system')],
            lastOpponentDamage: null,
            lastPlayerDamage: null,
            lastAttackElement: move.type,
            lastAttackSide: 'opponent',
          };
        }
      }

      const ctx = applyMoveEffects(
        {
          casterHp: p2.hp, casterMaxHp: p2.maxHp,
          targetHp: state.player.hp, targetMaxHp: state.player.maxHp,
          activeEffects: state.activeEffects, logs: [],
          casterSide: 'opponent', casterName: p2.name,
          targetSide: 'player', targetName: state.player.name,
          move, lastDamageDealt: 0, lastRawEffect: 0,
          attackerBaseDamage: p2.baseDamage,
          defenderBaseDefense: state.player.baseDefense,
          attackAllMult: getAttackAllBoost(state.activeEffects, 'opponent'),
          attackElemMult: getAttackElementBoost(state.activeEffects, 'opponent', move.type),
          defenderDefBoostPct: getDefenseBoostPct(state.activeEffects, 'player'),
        } satisfies MoveContext,
        playerDefType,
        p2.stats,
      );

      const isDefeat = move.baseDamage > 0 && checkDefeat(ctx.targetHp);

      const p1JustStunned = ctx.activeEffects.some(
        e => e.target === 'player' && e.stunned && !state.activeEffects.some(prev => prev === e),
      );

      return {
        ...state,
        phase: isDefeat ? 'defeat' : 'opponent_turn',
        player: { ...state.player, hp: ctx.targetHp },
        player2: { ...p2, hp: ctx.casterHp, mp: p2.mp - move.mpCost },
        opponent: { ...state.opponent, hp: state.player2.hp },
        log: [...state.log, ...ctx.logs],
        activeEffects: ctx.activeEffects,
        playerStunned: p1JustStunned ? true : state.playerStunned,
        lastOpponentDamage: move.baseDamage > 0 ? ctx.lastRawEffect : null,
        lastPlayerDamage: null,
        lastAttackElement: move.type,
        lastAttackSide: 'opponent',
      };
    }

    case 'P2_STUN_SKIP': {
      if (state.phase !== 'p2_turn' || !state.player2Stunned) return state;
      return {
        ...state,
        phase: 'opponent_turn',
        log: [...state.log, mkLog(`${state.player2?.name ?? 'Player 2'} is stunned and can't act!`, 'system')],
        player2Stunned: false,
        lastPlayerDamage: null,
        lastOpponentDamage: null,
        lastAttackElement: null,
        lastAttackSide: null,
      };
    }

    case 'TICK_RESOLVE': {
      if (state.phase !== 'opponent_turn') return state;

      const newLogs: BattleLogEntry[] = [];
      let newPlayerHp = state.player.hp;
      let newPlayerMp = state.player.mp;
      let newOpponentHp = state.opponent.hp;
      let newP2Hp = state.player2?.hp ?? 0;
      let newP2Mp = state.player2?.mp ?? 0;
      const remainingEffects: ActiveEffect[] = [];
      let nextPlayerStunned = false;
      let nextOpponentStunned = false;
      let nextPlayer2Stunned = false;

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
          // In PvP 'opponent' target means P2
          if (state.mode === 'pvp' && eff.target === 'opponent') nextPlayer2Stunned = true;
        }

        // hp/mp boost regen ticks each turn (on skipFirstTick round too — applied immediately)
        if (eff.boostKind === 'hp' && (eff.boostPercent ?? 0) > 0) {
          if (eff.target === 'player' && newPlayerHp > 0) {
            const regen = Math.max(1, Math.floor(state.player.maxHp * eff.boostPercent! / 100));
            const actual = Math.min(regen, state.player.maxHp - newPlayerHp);
            if (actual > 0) {
              newPlayerHp += actual;
              newLogs.push(mkLog(`${eff.sourceName} restored ${actual} HP!`, 'system'));
            }
          } else if (eff.target === 'opponent' && newOpponentHp > 0) {
            const regen = Math.max(1, Math.floor(state.opponent.def.maxHp * eff.boostPercent! / 100));
            const actual = Math.min(regen, state.opponent.def.maxHp - newOpponentHp);
            if (actual > 0) {
              newOpponentHp += actual;
              newLogs.push(mkLog(`${state.opponent.def.name} regenerated ${actual} HP!`, 'system'));
            }
          }
        }

        if (eff.boostKind === 'mp' && (eff.boostPercent ?? 0) > 0 && eff.target === 'player') {
          const regen = Math.max(1, Math.floor(state.player.maxMp * eff.boostPercent! / 100));
          const actual = Math.min(regen, state.player.maxMp - newPlayerMp);
          if (actual > 0) {
            newPlayerMp += actual;
            newLogs.push(mkLog(`${eff.sourceName} restored ${actual} MP!`, 'system'));
          }
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
          } else if (eff.boostKind) {
            newLogs.push(mkLog(
              `${eff.target === 'player' ? 'Your' : `${state.opponent.def.name}'s`} ${eff.sourceName} boost wore off!`,
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

      const hpBoostPct = getHpRegenBoostPct(remainingEffects, 'player');
      if (hpBoostPct > 0 && newPlayerHp > 0) {
        const healed = Math.min(Math.max(1, Math.floor(state.player.maxHp * hpBoostPct / 100)), state.player.maxHp - newPlayerHp);
        if (healed > 0) {
          newPlayerHp += healed;
          newLogs.push(mkLog(`You regenerated ${healed} HP from your boost.`, 'system'));
        }
      }
      const mpBoostPct = getMpRegenBoostPct(remainingEffects, 'player');
      if (mpBoostPct > 0) {
        const restored = Math.min(Math.max(1, Math.floor(state.player.maxMp * mpBoostPct / 100)), state.player.maxMp - newPlayerMp);
        if (restored > 0) {
          newPlayerMp += restored;
          newLogs.push(mkLog(`You recovered ${restored} MP from your boost.`, 'system'));
        }
      }

      const opponentHpBoostPct = getHpRegenBoostPct(remainingEffects, 'opponent');
      if (opponentHpBoostPct > 0 && newOpponentHp > 0) {
        const healed = Math.min(Math.max(1, Math.floor(state.opponent.def.maxHp * opponentHpBoostPct / 100)), state.opponent.def.maxHp - newOpponentHp);
        if (healed > 0) {
          newOpponentHp += healed;
          newLogs.push(mkLog(`${state.opponent.def.name} regenerated ${healed} HP.`, 'system'));
        }
      }

      // PvP: P2 equipment regen
      if (state.mode === 'pvp' && state.player2) {
        const p2 = state.player2;
        if (state.hpRegenPerTurnP2 > 0 && newP2Hp > 0) {
          const healed = Math.min(state.hpRegenPerTurnP2, p2.maxHp - newP2Hp);
          if (healed > 0) {
            newP2Hp += healed;
            newLogs.push(mkLog(`${p2.name} regenerated ${healed} HP.`, 'system'));
          }
        }
        if (state.mpRegenPerTurnP2 > 0) {
          const restored = Math.min(state.mpRegenPerTurnP2, p2.maxMp - newP2Mp);
          if (restored > 0) {
            newP2Mp += restored;
            newLogs.push(mkLog(`${p2.name} recovered ${restored} MP.`, 'system'));
          }
        }
      }

      const isVictory = checkVictory(newOpponentHp);
      const isDefeat = !isVictory && checkDefeat(newPlayerHp);

      return {
        ...state,
        phase: isVictory ? 'victory' : isDefeat ? 'defeat' : 'player_turn',
        turn: state.turn + 1,
        player: { ...state.player, hp: newPlayerHp, mp: newPlayerMp },
        player2: state.player2 ? { ...state.player2, hp: newP2Hp, mp: newP2Mp } : null,
        opponent: { ...state.opponent, hp: newOpponentHp },
        log: [...state.log, ...newLogs],
        lastPlayerDamage: null,
        lastOpponentDamage: null,
        lastAttackElement: null,
        lastAttackSide: null,
        activeEffects: remainingEffects,
        playerStunned: nextPlayerStunned,
        opponentStunned: nextOpponentStunned,
        player2Stunned: nextPlayer2Stunned,
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
