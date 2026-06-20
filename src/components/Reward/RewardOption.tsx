import type { RewardOption, PlayerStatBonuses } from '../../types';
import { getTypeIcon, moveDamageRange } from '../../utils/damage';

interface RewardOptionCardProps {
  reward: RewardOption;
  playerStats: PlayerStatBonuses;
  onClick: () => void;
}

function rewardIcon(reward: RewardOption): string {
  if (reward.type === 'cinematic') return '🎬';
  if (reward.type === 'loot') return '💰';
  if (reward.move) return getTypeIcon(reward.move.type);
  return '⬆️';
}

function rewardBg(reward: RewardOption): string {
  if (reward.type === 'cinematic') return 'border-pink-600 bg-pink-900/20 hover:bg-pink-900/40';
  if (reward.type === 'loot') return 'border-reward-loot bg-reward-loot-bg hover:bg-reward-loot-hover';
  if (reward.type === 'learn_new') return 'border-purple-600 bg-purple-900/20 hover:bg-purple-900/40';
  return 'border-blue-600 bg-blue-900/20 hover:bg-blue-900/40';
}

const fmtRange = (r: { min: number; max: number }) =>
  r.min === r.max ? `${r.min}` : `${r.min}–${r.max}`;

export function RewardOptionCard({ reward, playerStats, onClick }: RewardOptionCardProps) {
  return (
    <button
      onClick={onClick}
      className={`
        w-full text-left rounded-xl border p-5 transition-all duration-150 cursor-pointer
        ${rewardBg(reward)}
      `}
    >
      <div className="flex items-start gap-4">
        <span className="text-4xl">{rewardIcon(reward)}</span>
        <div className="flex-1">
          <h3 className="font-bold text-text-bright mb-1">{reward.label}</h3>
          <p className="text-sm text-text-muted">{reward.description}</p>
          {reward.move && (() => {
            const move = reward.move!;
            const cur = moveDamageRange(move, playerStats);
            const nextMove = move.level < move.maxLevel ? { ...move, level: move.level + 1 } : null;
            const next = nextMove ? moveDamageRange(nextMove, playerStats) : null;
            return (
              <div className="mt-2 flex flex-wrap gap-3 text-xs">
                <span className="text-blue-400">{move.mpCost} MP</span>
                {cur && (
                  move.baseDamage > 0
                    ? <span className="text-orange-400">{fmtRange(cur)} dmg</span>
                    : <span className="text-green-400">heals {fmtRange({ min: Math.abs(cur.max), max: Math.abs(cur.min) })}</span>
                )}
                {next && cur && reward.type === 'upskill' && (
                  move.baseDamage > 0
                    ? <span className="text-accent">→ {fmtRange(next)} dmg</span>
                    : <span className="text-accent">→ heals {fmtRange({ min: Math.abs(next.max), max: Math.abs(next.min) })}</span>
                )}
                <span className="text-text-faint">Lv{move.level}{reward.type === 'upskill' ? `→${move.level + 1}` : ''} / {move.maxLevel}</span>
              </div>
            );
          })()}
        </div>
        <span className="text-text-muted text-xl self-center">▶</span>
      </div>
    </button>
  );
}
