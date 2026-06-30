import type { OpponentGift } from '../../types';
import { MenuButton } from '../ui/MenuButton';

interface RewardGiftsMenuProps {
  gifts: OpponentGift[];
  playerGold: number;
  focusedIndex: number;
  onGift: (giftId: number) => void;
}

export function RewardGiftsMenu({ gifts, playerGold, focusedIndex, onGift }: RewardGiftsMenuProps) {
  if (gifts.length === 0) {
    return <p className="text-text-muted text-sm text-center py-4">No gifts available.</p>;
  }

  return (
    <div className="flex flex-col gap-3">
      {gifts.map((gift, i) => {
        const canAfford = playerGold >= gift.gold;
        return (
          <MenuButton
            key={gift.id}
            icon="🎁"
            label={gift.name}
            description={`${gift.gold}g · deepens your bond`}
            disabled={!canAfford}
            disabledReason={!canAfford ? 'Not enough gold' : undefined}
            focused={focusedIndex === i && canAfford}
            onClick={() => onGift(gift.id)}
            accent="pink"
          />
        );
      })}
    </div>
  );
}
