import type { RewardOption, Move } from '../../types';
import { MenuButton } from '../ui/MenuButton';

interface RewardReplaceSkillMenuProps {
  pendingReward: RewardOption;
  learnedPool: Move[];
  focusedIndex: number;
  onReplace: (replacePoolMoveId: string) => void;
}

export function RewardReplaceSkillMenu({ pendingReward, learnedPool, focusedIndex, onReplace }: RewardReplaceSkillMenuProps) {
  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-text-muted mb-1">
        All skill slots are full. Choose a backup skill to replace with{' '}
        <span className="text-text-bright font-semibold">{pendingReward.move?.name ?? pendingReward.label}</span>:
      </p>
      {learnedPool.map((move, i) => (
        <MenuButton
          key={move.id}
          icon={move.icon ?? '⚔️'}
          label={move.name}
          description={`Lv${move.level} · ${move.mpCost} MP`}
          focused={focusedIndex === i}
          onClick={() => onReplace(move.id)}
        />
      ))}
    </div>
  );
}
