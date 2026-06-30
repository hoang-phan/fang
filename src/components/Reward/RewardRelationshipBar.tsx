import type { RelationshipProgress } from '../../types';
import { GoldDisplay } from '../ui/GoldDisplay';

interface RewardRelationshipBarProps {
  gold: number;
  opponentName?: string;
  relProgress: RelationshipProgress;
  relXpNeeded: number;
}

export function RewardRelationshipBar({ gold, opponentName, relProgress, relXpNeeded }: RewardRelationshipBarProps) {
  return (
    <div className="flex items-center justify-between mb-6 gap-4">
      <GoldDisplay gold={gold} />
      {opponentName && (
        <div className="flex flex-col items-end gap-1 min-w-0">
          <span className="text-xs text-text-faint">Relationship Lv {relProgress.level}</span>
          <div className="flex items-center gap-2">
            <div className="w-28 h-2 bg-theme-surface rounded-full overflow-hidden">
              <div
                className="h-full bg-pink-500 rounded-full transition-all"
                style={{ width: `${(relProgress.xp / relXpNeeded) * 100}%` }}
              />
            </div>
            <span className="text-xs text-text-faint whitespace-nowrap">{relProgress.xp}/{relXpNeeded}</span>
          </div>
        </div>
      )}
    </div>
  );
}
