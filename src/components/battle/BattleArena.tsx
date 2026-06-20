import type { ReactNode } from 'react';

interface BattleArenaProps {
  top: ReactNode;
  middle: ReactNode;
  bottom: ReactNode;
}

export function BattleArena({ top, middle, bottom }: BattleArenaProps) {
  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 p-3 lg:p-4 flex flex-col gap-3 overflow-hidden">
        <div className="flex gap-2 lg:gap-3">
          {top}
        </div>
        <div className="flex-1 min-h-0">
          {middle}
        </div>
      </div>
      <div className="shrink-0">
        {bottom}
      </div>
    </div>
  );
}
