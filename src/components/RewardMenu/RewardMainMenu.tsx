import type { RewardOption } from '../../types';
import { MenuButton } from '../ui/MenuButton';

interface RewardMainMenuProps {
  skillRewards: RewardOption[];
  lootReward: RewardOption | undefined;
  focusedIndex: number;
  onShowSkills: () => void;
  onShowInteractions: () => void;
  onLoot: () => void;
  onSkip: () => void;
}

export function RewardMainMenu({
  skillRewards,
  lootReward,
  focusedIndex,
  onShowSkills,
  onShowInteractions,
  onLoot,
  onSkip,
}: RewardMainMenuProps) {
  let idx = 0;
  const skillIdx = skillRewards.length > 0 ? idx++ : -1;
  const interactIdx = idx++;
  const lootIdx = lootReward ? idx++ : -1;
  const skipIdx = idx++;

  return (
    <div className="flex flex-col gap-3">
      <MenuButton
        icon="⚔️"
        label="Skills"
        description={skillRewards.length > 0 ? `${skillRewards.length} option${skillRewards.length > 1 ? 's' : ''} available` : 'No skills available'}
        disabled={skillRewards.length === 0}
        focused={focusedIndex === skillIdx && skillIdx !== -1}
        onClick={onShowSkills}
      />
      <MenuButton
        icon="💬"
        label="Interactions"
        description="Chat, give gifts, or events"
        focused={focusedIndex === interactIdx}
        onClick={onShowInteractions}
      />
      <MenuButton
        icon="💰"
        label="Loot"
        description={lootReward ? 'Gold + possible item drop' : 'No loot available'}
        disabled={!lootReward}
        focused={focusedIndex === lootIdx && lootIdx !== -1}
        onClick={onLoot}
        accent="gold"
      />
      <button
        onClick={onSkip}
        className={`text-sm text-center mt-2 py-2 transition-colors ${focusedIndex === skipIdx ? 'text-text-bright underline' : 'text-text-faint hover:text-text-muted'}`}
      >
        Skip → Shop
      </button>
    </div>
  );
}
