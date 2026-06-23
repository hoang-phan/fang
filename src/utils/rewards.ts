import type { Move, OpponentDef, PlayerStats, RewardOption } from '../types';

export function generateRewards(
  opponent: OpponentDef,
  player: PlayerStats,
  seed: number,
  opponentMovesUsed: Move[] = []
): RewardOption[] {
  const rewards: RewardOption[] = [];
  const allPlayerMoves = [...player.moves.filter(Boolean), ...player.learnedPool] as NonNullable<PlayerStats['moves'][number]>[];

  const usedMoveIds = new Set(opponentMovesUsed.map(m => m.id));
  const eligibleMoves = usedMoveIds.size > 0
    ? opponent.moves.filter(m => usedMoveIds.has(m.id))
    : opponent.moves;

  for (const oppMove of eligibleMoves) {
    const existing = allPlayerMoves.find(m => m.id === oppMove.id);

    if (existing && existing.level < existing.maxLevel) {
      rewards.push({
        type: 'upskill',
        move: oppMove,
        label: `Upskill ${oppMove.name}`,
        description: `Level up ${oppMove.name}. Grow stronger together.`,
      });
    } else if (!existing) {
      rewards.push({
        type: 'learn_new',
        move: oppMove,
        label: `Learn ${oppMove.name}`,
        description: oppMove.description,
      });
    }
  }

  if (opponent.cinematics && opponent.cinematics.length > 0) {
    const idx = Math.min(opponent.level, 5) - 1;
    const cinematicUrl = opponent.cinematics[Math.max(0, idx)];
    rewards.push({
      type: 'cinematic',
      cinematicUrl,
      label: `Watch ${opponent.name}'s Cinematic`,
      description: 'Unlock a cinematic scene. Other rewards are forfeited.',
    });
  }

  const [min, max] = opponent.goldReward;
  const gold = min + Math.floor(seed * (max - min + 1));
  rewards.push({
    type: 'loot',
    gold,
    label: 'Take the Loot',
    description: `Claim ${gold} gold from the fallen foe.`,
  });

  return rewards;
}
