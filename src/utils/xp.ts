import type { ElementType, OpponentDef, OpponentProgress, RelationshipProgress } from '../types';

/** Expand a single backend gold_reward value to [min, max] at a given level: base * 1.2^(level-1) ±20%. */
export function expandGoldReward(base: number, level: number): [number, number] {
  const scaled = base * Math.pow(1.2, level - 1);
  const variance = scaled * 0.2;
  return [Math.max(0, Math.round(scaled - variance)), Math.round(scaled + variance)];
}

const ELEMENT_ORDER: ElementType[] = [
  'normal', 'fire', 'water', 'electric', 'grass',
  'ice', 'poison', 'earth', 'dark', 'psychic',
];

/**
 * Derive the player's defensive type from their stat distribution.
 * The element with the highest investment wins; ties break on canonical order.
 * Used by battleReducer to determine type effectiveness against player specials.
 */
export function getPlayerDefensiveType(stats: Partial<Record<ElementType, number>>): ElementType {
  let best: ElementType = 'normal';
  let bestVal = -1;
  for (const el of ELEMENT_ORDER) {
    const val = stats[el] ?? 0;
    if (val > bestVal) { bestVal = val; best = el; }
  }
  return best;
}

/**
 * Pick a random opponent weighted inversely by their current level.
 * Lower-level opponents have higher probability so power levels converge over time,
 * but using sqrt keeps it from being too predictable.
 *
 * Weight formula: 1 / sqrt(oppLevel)
 */
export function pickWeightedRandomOpponent(
  opponents: OpponentDef[],
  opponentProgressMap: Record<string, OpponentProgress>,
): OpponentDef | null {
  if (opponents.length === 0) return null;

  const weights = opponents.map(opp => {
    const progress = opponentProgressMap[opp.id];
    const level = progress ? progress.level : opp.level;
    return 1 / Math.sqrt(level);
  });

  const total = weights.reduce((sum, w) => sum + w, 0);
  let rand = Math.random() * total;

  for (let i = 0; i < opponents.length; i++) {
    rand -= weights[i];
    if (rand <= 0) return opponents[i];
  }

  return opponents[opponents.length - 1];
}

/** XP required to reach the next level (from current level). */
export function xpToNextLevel(level: number): number {
  return level * 100;
}

/**
 * Apply an XP gain to a level/xp pair and return the new values.
 * Handles multi-level-ups in a single call.
 */
export function applyXp(
  currentLevel: number,
  currentXp: number,
  xpGain: number,
): { level: number; xp: number; levelsGained: number } {
  let level = currentLevel;
  let xp = currentXp + xpGain;
  let levelsGained = 0;

  while (xp >= xpToNextLevel(level)) {
    xp -= xpToNextLevel(level);
    level += 1;
    levelsGained += 1;
  }

  return { level, xp, levelsGained };
}

/**
 * XP the player earns after a battle.
 * Win:  baseXp * 1.5^(opponent.level - 1)   (player is the winner; loser is the opponent)
 * Lose: baseXp * 1.5^(player.level - 1) * 0.2
 *
 * base_xp is always the opponent's baseXp field.
 */
export function calcPlayerXpGain(opponent: OpponentDef, won: boolean, playerLevel: number): number {
  const baseXp = opponent.baseXp;
  if (won) {
    return Math.round(baseXp * Math.pow(1.5, opponent.level - 1));
  }
  return Math.round(baseXp * Math.pow(1.5, playerLevel - 1) * 0.2);
}

/**
 * XP the opponent earns after a battle.
 * Win (opponent won, player lost): baseXp * 1.5^(opponent.level - 1)   [winner's level in exponent]
 * Lose:                            baseXp * 1.5^(player.level - 1) * 0.2  [winner's level in exponent]
 *
 * base_xp is always the opponent's baseXp field.
 */
export function calcOpponentXpGain(opponent: OpponentDef, opponentWon: boolean, playerLevel: number): number {
  const baseXp = opponent.baseXp;
  if (opponentWon) {
    return Math.round(baseXp * Math.pow(1.5, opponent.level - 1));
  }
  return Math.round(baseXp * Math.pow(1.5, playerLevel - 1) * 0.2);
}

// ─── Relationship helpers ─────────────────────────────────────────────────────

/** XP required to advance from the given relationship level to the next. */
export function relXpToNextLevel(level: number): number {
  return (level + 1) * 100;
}

/** Get current relationship progress or default (level 0, 0 xp). */
export function getRelationshipProgress(
  relationshipProgress: Record<string, RelationshipProgress>,
  opponentId: string,
): RelationshipProgress {
  return relationshipProgress[opponentId] ?? { level: 0, xp: 0 };
}

/** Apply an XP gain to a relationship progress, handling level-ups. */
export function applyRelXp(
  current: RelationshipProgress,
  xpGain: number,
): RelationshipProgress {
  let level = current.level;
  let xp = current.xp + xpGain;
  while (xp >= relXpToNextLevel(level)) {
    xp -= relXpToNextLevel(level);
    level += 1;
  }
  return { level, xp };
}

// ─── Opponent progress helpers ────────────────────────────────────────────────

/** Get current opponent progress or sensible default. */
export function getOpponentProgress(
  opponentProgress: Record<string, OpponentProgress>,
  opponentId: string,
  baseLevel: number,
): OpponentProgress {
  return opponentProgress[opponentId] ?? { level: baseLevel, xp: 0 };
}

/**
 * Returns a copy of OpponentDef scaled to the opponent's current level:
 * - +10% maxHp per level gained
 * - +5% baseDamage per level gained (multiplicative)
 * - +1 flat damage per level gained to auto-attack and moves of the opponent's own type (stat bonus)
 * - Move levels scale up to min(currentLevel, maxLevel), capped at 5
 * - Gold reward range scales up by +10% per level gained
 */
export function getScaledOpponent(def: OpponentDef, progress: OpponentProgress): OpponentDef {
  const levelsGained = progress.level - def.level;
  if (levelsGained <= 0) return def;

  const hpMult = 1 + levelsGained * 0.1;
  const dmgMult = 1 + levelsGained * 0.05;
  // +1 flat damage bonus per level gained to attacks of the opponent's own type
  const typeBonus = levelsGained;

  const scaledBaseDamage = Math.round(def.baseDamage * dmgMult) + typeBonus;

  const moveLevel = Math.min(progress.level, 5);
  const scaledMoves = def.moves.map(m => {
    const newLevel = Math.min(moveLevel, m.maxLevel);
    const typeBonusForMove = m.type === def.type ? typeBonus : 0;
    return {
      ...m,
      level: newLevel,
      baseDamage: m.baseDamage + typeBonusForMove,
    };
  });

  const scaledGold = expandGoldReward(def.goldRewardBase, progress.level);

  return {
    ...def,
    level: progress.level,
    maxHp: Math.round(def.maxHp * hpMult),
    baseDamage: scaledBaseDamage,
    moves: scaledMoves,
    goldReward: scaledGold,
  };
}
