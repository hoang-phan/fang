/**
 * Pure special-move effect handlers for battle resolution.
 *
 * Each handler receives a MoveContext — a lightweight snapshot of the mutable
 * values for one action (HP, active effects, log entries, caster/target identity)
 * — applies a single effect, and returns a new context. No side effects.
 *
 * Compose via applyMoveEffects, which sequences:
 *   heal  OR  (damage → leech → DoT → stun)
 *   then shield (always, if the move has baseDefense)
 *
 * battleReducer builds a MoveContext from BattleState, calls applyMoveEffects,
 * then writes ctx back into the next state in one spread.
 */

import type { ActiveEffect, BattleLogEntry, ElementType, Move, PlayerStatBonuses } from '../types';
import { calcMoveEffect, effectivenessLabel, getTypeEffectiveness, getTypeIcon } from './damage';

// ─── Shared log/shield utilities ────────────────────────────────────────────

let logCounter = 0;
export function mkLog(text: string, logType: BattleLogEntry['type'], moveType?: ElementType): BattleLogEntry {
  return { id: ++logCounter, text, type: logType, moveType };
}

export function sumShield(effects: ActiveEffect[], target: 'player' | 'opponent'): number {
  return effects.filter(e => e.target === target && e.defense > 0).reduce((s, e) => s + e.defense, 0);
}

const STATUS_LABEL: Partial<Record<ElementType, string>> = {
  fire:     'burned',
  poison:   'poisoned',
  electric: 'paralyzed',
  ice:      'frozen',
  dark:     'cursed',
  psychic:  'confused',
  grass:    'seeded',
  water:    'soaked',
  earth:    'buried',
  normal:   'weakened',
};

export function statusLabel(type: ElementType): string {
  return STATUS_LABEL[type] ?? 'afflicted';
}

// ─── MoveContext ─────────────────────────────────────────────────────────────

export interface MoveContext {
  casterHp:          number;
  casterMaxHp:       number;
  targetHp:          number;
  targetMaxHp:       number;
  activeEffects:     ActiveEffect[];
  logs:              BattleLogEntry[];
  casterSide:        'player' | 'opponent';
  casterName:        string;  // "You" | opponent display name
  targetSide:        'player' | 'opponent';
  targetName:        string;  // "you" | opponent display name
  move:              Move;
  lastDamageDealt:   number;  // post-shield damage dealt — read by applyLeech
  lastRawEffect:     number;  // pre-shield raw effect — used for damage animation
  attackerBaseDamage: number; // flat bonus from attacker's baseDamage stat
  defenderBaseDefense: number; // flat reduction from defender's baseDefense stat
}

// ─── Effect handlers ─────────────────────────────────────────────────────────

export function applyHeal(ctx: MoveContext, statBonuses?: PlayerStatBonuses): MoveContext {
  if (ctx.move.baseDamage >= 0) return ctx;
  const rawEffect = calcMoveEffect(ctx.move, undefined, statBonuses);
  const healed = Math.abs(rawEffect);
  return {
    ...ctx,
    casterHp: Math.min(ctx.casterMaxHp, ctx.casterHp + healed),
    logs: [...ctx.logs, mkLog(
      `${ctx.casterName} used ${getTypeIcon(ctx.move.type)} ${ctx.move.name} and restored ${healed} HP!`,
      ctx.casterSide,
      ctx.move.type,
    )],
  };
}

export function applyDamage(ctx: MoveContext, defenderType: ElementType, statBonuses?: PlayerStatBonuses): MoveContext {
  if (ctx.move.baseDamage <= 0) return ctx;
  const elementalDamage = calcMoveEffect(ctx.move, defenderType, statBonuses);
  // Total pre-shield damage: attacker's baseDamage bonus - defender's baseDefense + elemental damage
  const rawEffect = Math.max(1, elementalDamage + ctx.attackerBaseDamage - ctx.defenderBaseDefense);
  const shield = sumShield(ctx.activeEffects, ctx.targetSide);
  const damage = Math.max(0, rawEffect - shield);
  const effectiveness = getTypeEffectiveness(ctx.move.type, defenderType);
  const effectLabel = effectivenessLabel(effectiveness);

  const casterIsPlayer = ctx.casterSide === 'player';
  let msg = `${ctx.casterName} used ${getTypeIcon(ctx.move.type)} ${ctx.move.name} for ${damage} damage!`;
  if (shield > 0 && rawEffect > 0) {
    msg += casterIsPlayer
      ? ` (shield absorbed ${Math.min(shield, rawEffect)})`
      : ` (${ctx.targetName === 'you' ? 'your' : `${ctx.targetName}'s`} shield absorbed ${Math.min(shield, rawEffect)})`;
  }

  const newLogs = [...ctx.logs, mkLog(msg, ctx.casterSide, ctx.move.type)];
  if (effectLabel) newLogs.push(mkLog(effectLabel, 'system'));

  return {
    ...ctx,
    targetHp: Math.max(0, ctx.targetHp - damage),
    logs: newLogs,
    lastDamageDealt: damage,
    lastRawEffect: rawEffect,
  };
}

export function applyLeech(ctx: MoveContext): MoveContext {
  if (!ctx.move.leech || ctx.lastDamageDealt <= 0) return ctx;
  const leeched = Math.max(1, Math.round(ctx.lastDamageDealt * ctx.move.leech / 100));
  const leechMsg = ctx.casterSide === 'player'
    ? `${ctx.move.name} leeched ${leeched} HP back to you!`
    : `${ctx.casterName} leeched ${leeched} HP!`;
  return {
    ...ctx,
    casterHp: Math.min(ctx.casterMaxHp, ctx.casterHp + leeched),
    logs: [...ctx.logs, mkLog(leechMsg, 'system')],
  };
}

export function applyDoT(ctx: MoveContext): MoveContext {
  const { move } = ctx;
  if (!move.effectDamage || !move.effectTurns || !move.effectProb || move.effectStun) return ctx;
  if (Math.random() * 100 >= move.effectProb) return ctx;

  const status = statusLabel(move.type);
  const logMsg = ctx.targetName === 'you' ? `You were ${status}!` : `${ctx.targetName} was ${status}!`;

  return {
    ...ctx,
    activeEffects: [...ctx.activeEffects, {
      sourceName: move.name,
      sourceType: move.type,
      damage: move.effectDamage,
      defense: 0,
      stunned: false,
      turnsLeft: move.effectTurns,
      target: ctx.targetSide,
    }],
    logs: [...ctx.logs, mkLog(logMsg, 'system')],
  };
}

export function applyStun(ctx: MoveContext): MoveContext {
  const { move } = ctx;
  if (!move.effectStun || !move.effectTurns || !move.effectProb) return ctx;
  if (Math.random() * 100 >= move.effectProb) return ctx;

  const logMsg = ctx.targetName === 'you' ? `You are stunned!` : `${ctx.targetName} is stunned!`;

  return {
    ...ctx,
    activeEffects: [...ctx.activeEffects, {
      sourceName: move.name,
      sourceType: move.type,
      damage: 0,
      defense: 0,
      stunned: true,
      turnsLeft: move.effectTurns,
      target: ctx.targetSide,
    }],
    logs: [...ctx.logs, mkLog(logMsg, 'system')],
  };
}

export function applyShield(ctx: MoveContext): MoveContext {
  const { move } = ctx;
  if (!move.baseDefense || !move.effectTurns) return ctx;
  const scaledDefense = Math.round(move.baseDefense * (1 + (move.level - 1) * 0.25));
  const turns = move.effectTurns;
  const logMsg = ctx.casterSide === 'player'
    ? `You gained ${scaledDefense} defense for ${turns} turn${turns > 1 ? 's' : ''}!`
    : `${ctx.casterName} raised its defense by ${scaledDefense} for ${turns} turn${turns > 1 ? 's' : ''}!`;

  return {
    ...ctx,
    activeEffects: [...ctx.activeEffects, {
      sourceName: move.name,
      sourceType: move.type,
      damage: 0,
      defense: scaledDefense,
      stunned: false,
      turnsLeft: turns,
      target: ctx.casterSide,
    }],
    logs: [...ctx.logs, mkLog(logMsg, 'system')],
  };
}

// ─── Coordinator ─────────────────────────────────────────────────────────────

/**
 * Sequences all applicable handlers for one move action.
 * Heal and damage are mutually exclusive (sign of baseDamage).
 * Shield always applies last if the move has baseDefense.
 */
export function applyMoveEffects(ctx: MoveContext, defenderType: ElementType, statBonuses?: PlayerStatBonuses): MoveContext {
  if (ctx.move.baseDamage < 0) {
    ctx = applyHeal(ctx, statBonuses);
  } else {
    ctx = applyDamage(ctx, defenderType, statBonuses);
    ctx = applyLeech(ctx);
    ctx = applyDoT(ctx);
    ctx = applyStun(ctx);
  }
  return applyShield(ctx);
}
