import type { OpponentDef, OpponentProgress, RelationshipProgress } from '../types';

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
 * XP the player earns.
 * - Win: opponent.level * 50
 * - Lose: opponent.level * 10
 */
export function calcPlayerXpGain(opponent: OpponentDef, won: boolean): number {
  return won ? opponent.level * 50 : opponent.level * 10;
}

/**
 * XP the opponent earns.
 * - Win (player lost): opponent.level * 40
 * - Lose: opponent.level * 5
 */
export function calcOpponentXpGain(opponent: OpponentDef, opponentWon: boolean): number {
  return opponentWon ? opponent.level * 40 : opponent.level * 5;
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

  const goldMult = 1 + levelsGained * 0.1;
  const scaledGold: [number, number] = [
    Math.round(def.goldReward[0] * goldMult),
    Math.round(def.goldReward[1] * goldMult),
  ];

  return {
    ...def,
    level: progress.level,
    maxHp: Math.round(def.maxHp * hpMult),
    baseDamage: scaledBaseDamage,
    moves: scaledMoves,
    goldReward: scaledGold,
  };
}
