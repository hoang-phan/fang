import type { OpponentCinematic } from '../../types';
import { MenuButton } from '../ui/MenuButton';

interface RewardCinematicsMenuProps {
  cinematics: OpponentCinematic[];
  focusedIndex: number;
  onWatch: (cinematic: OpponentCinematic) => void;
}

export function RewardCinematicsMenu({ cinematics, focusedIndex, onWatch }: RewardCinematicsMenuProps) {
  return (
    <div className="flex flex-col gap-3">
      {cinematics.map((c, i) => (
        <MenuButton
          key={c.level}
          icon="💕"
          label={`Scene ${i + 1}`}
          description={c.description ?? `Relationship level ${c.level - 1}`}
          focused={focusedIndex === i}
          onClick={() => onWatch(c)}
          accent="pink"
        />
      ))}
    </div>
  );
}
