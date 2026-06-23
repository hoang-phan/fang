import type { RewardOption } from '../../types';
import { getTypeIcon } from '../../utils/damage';

interface RewardOptionCardProps {
  reward: RewardOption;
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

export function RewardOptionCard({ reward, onClick }: RewardOptionCardProps) {
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
            return (
              <div className="mt-2 flex flex-wrap gap-3 text-xs">
                <span className="text-blue-400">{move.mpCost} MP</span>
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
