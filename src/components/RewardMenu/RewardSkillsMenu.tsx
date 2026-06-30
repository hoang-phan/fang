import type { RewardOption } from '../../types';
import { RewardOptionCard } from './RewardOption';

interface RewardSkillsMenuProps {
  skillRewards: RewardOption[];
  focusedIndex: number;
  onChoose: (reward: RewardOption) => void;
}

export function RewardSkillsMenu({ skillRewards, focusedIndex, onChoose }: RewardSkillsMenuProps) {
  return (
    <div className="flex flex-col gap-4">
      {skillRewards.map((reward, i) => (
        <RewardOptionCard
          key={i}
          reward={reward}
          focused={focusedIndex === i}
          onClick={() => onChoose(reward)}
        />
      ))}
    </div>
  );
}
