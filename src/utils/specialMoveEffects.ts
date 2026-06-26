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

import type { ActiveEffect, BoostKind, BattleLogEntry, ElementType, Move, PlayerStatBonuses } from '../types';
import { calcMoveEffect, effectivenessLabel, getTypeEffectiveness, getTypeIcon } from './damage';

// ─── Shared log/shield utilities ────────────────────────────────────────────

let logCounter = 0;
export function mkLog(text: string, logType: BattleLogEntry['type'], moveType?: ElementType): BattleLogEntry {
  return { id: ++logCounter, text, type: logType, moveType };
}

export function sumShield(effects: ActiveEffect[], target: 'player' | 'opponent'): number {
  return effects.filter(e => e.target === target && e.defense > 0).reduce((s, e) => s + e.defense, 0);
}

// Returns a combined damage multiplier from all active attack_all boosts for a side (1.0 = no boost)
export function getAttackAllBoost(effects: ActiveEffect[], side: 'player' | 'opponent'): number {
  return effects
    .filter(e => e.target === side && e.boostKind === 'attack_all' && (e.boostPercent ?? 0) > 0)
    .reduce((mult, e) => mult * (1 + (e.boostPercent!) / 100), 1);
}

// Returns a combined damage multiplier from attack_element boosts for a specific element and side
export function getAttackElementBoost(effects: ActiveEffect[], side: 'player' | 'opponent', element: ElementType): number {
  return effects
    .filter(e => e.target === side && e.boostKind === 'attack_element' && e.boostElement === element && (e.boostPercent ?? 0) > 0)
    .reduce((mult, e) => mult * (1 + (e.boostPercent!) / 100), 1);
}

// Returns an additional flat defense bonus from defense boosts (additive percentage of current baseDefense)
export function getDefenseBoostPct(effects: ActiveEffect[], side: 'player' | 'opponent'): number {
  return effects
    .filter(e => e.target === side && e.boostKind === 'defense' && (e.boostPercent ?? 0) > 0)
    .reduce((sum, e) => sum + (e.boostPercent!), 0);
}

// Returns the total evasion % chance from active evasion boosts for a side
export function getEvasionPct(effects: ActiveEffect[], side: 'player' | 'opponent'): number {
  return effects
    .filter(e => e.target === side && e.boostKind === 'evasion' && (e.boostPercent ?? 0) > 0)
    .reduce((sum, e) => sum + (e.boostPercent!), 0);
}

// Returns % of max HP to regen per tick (summed from all active hp boosts for a side)
export function getHpRegenBoostPct(effects: ActiveEffect[], side: 'player' | 'opponent'): number {
  return effects
    .filter(e => e.target === side && e.boostKind === 'hp' && (e.boostPercent ?? 0) > 0)
    .reduce((sum, e) => sum + (e.boostPercent!), 0);
}

// Returns % of max MP to regen per tick (summed from all active mp boosts for a side)
export function getMpRegenBoostPct(effects: ActiveEffect[], side: 'player' | 'opponent'): number {
  return effects
    .filter(e => e.target === side && e.boostKind === 'mp' && (e.boostPercent ?? 0) > 0)
    .reduce((sum, e) => sum + (e.boostPercent!), 0);
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
  // boost multipliers pre-computed by the caller (default 1.0 if not provided)
  attackAllMult?:    number;  // from attack_all active effects on the caster
  attackElemMult?:   number;  // from attack_element active effects matching the move's element
  defenderDefBoostPct?: number; // extra defense % from defender's defense boost effects
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
  // Apply attack boost multipliers from active effects
  const attackAllMult = ctx.attackAllMult ?? 1;
  const attackElemMult = ctx.attackElemMult ?? 1;
  const combinedDmgMult = attackAllMult * attackElemMult;
  // Defense is halved to prevent it from being too dominant; boosted defense applies additively
  const boostedDefense = ctx.defenderBaseDefense * (1 + (ctx.defenderDefBoostPct ?? 0) / 100);
  const rawEffect = Math.max(1, Math.round(elementalDamage * combinedDmgMult - Math.floor(boostedDefense * 0.5)));
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
      skipFirstTick: true,
    }],
    logs: [...ctx.logs, mkLog(logMsg, 'system')],
  };
}

const BOOST_LABEL: Record<BoostKind, string> = {
  attack_all:     'attack power',
  attack_element: 'elemental attack',
  defense:        'defense',
  evasion:        'evasion',
  hp:             'HP regeneration',
  mp:             'MP regeneration',
};

export function applyBoost(ctx: MoveContext): MoveContext {
  const { move } = ctx;
  if (!move.effectBoostKind || move.effectBoostKind === 'none' as string || !move.effectBoostPercent || !move.effectTurns) return ctx;

  const kind = move.effectBoostKind as BoostKind;
  const turns = move.effectTurns;
  const boostElement = kind === 'attack_element' ? move.type : undefined;
  const label = BOOST_LABEL[kind];
  const logMsg = ctx.casterSide === 'player'
    ? `Your ${label} increased by ${move.effectBoostPercent}% for ${turns} turn${turns > 1 ? 's' : ''}!`
    : `${ctx.casterName}'s ${label} increased by ${move.effectBoostPercent}% for ${turns} turn${turns > 1 ? 's' : ''}!`;

  // Replace any existing boost of the same kind on the same target.
  // attack_element is keyed by kind + element — different elements can coexist.
  const withoutOld = ctx.activeEffects.filter(e => {
    if (e.target !== ctx.casterSide || e.boostKind !== kind) return true;
    if (kind === 'attack_element') return e.boostElement !== boostElement;
    return false;
  });

  return {
    ...ctx,
    activeEffects: [...withoutOld, {
      sourceName: move.name,
      sourceType: move.type,
      damage: 0,
      defense: 0,
      stunned: false,
      turnsLeft: turns,
      target: ctx.casterSide,
      skipFirstTick: true,
      boostKind: kind,
      boostPercent: move.effectBoostPercent,
      boostElement,
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
      skipFirstTick: true,
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
  ctx = applyShield(ctx);
  ctx = applyBoost(ctx);
  return ctx;
}
