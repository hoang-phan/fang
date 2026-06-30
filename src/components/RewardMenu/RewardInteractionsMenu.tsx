import { MenuButton } from '../ui/MenuButton';

interface RewardInteractionsMenuProps {
  unlockedCinematicsCount: number;
  focusedIndex: number;
  onChat: () => void;
  onShowGifts: () => void;
  onShowCinematics: () => void;
}

export function RewardInteractionsMenu({
  unlockedCinematicsCount,
  focusedIndex,
  onChat,
  onShowGifts,
  onShowCinematics,
}: RewardInteractionsMenuProps) {
  return (
    <div className="flex flex-col gap-3">
      <MenuButton
        icon="💬"
        label="Chat"
        description="Have a conversation, get closer"
        focused={focusedIndex === 0}
        onClick={onChat}
        accent="pink"
      />
      <MenuButton
        icon="🎁"
        label="Gift"
        description="Give a gift to deepen your bond"
        focused={focusedIndex === 1}
        onClick={onShowGifts}
        accent="pink"
      />
      <MenuButton
        icon="💕"
        label="Events"
        description={unlockedCinematicsCount > 0 ? `${unlockedCinematicsCount} unlocked` : 'None unlocked yet'}
        disabled={unlockedCinematicsCount === 0}
        focused={focusedIndex === 2 && unlockedCinematicsCount > 0}
        onClick={onShowCinematics}
        accent="pink"
      />
    </div>
  );
}
