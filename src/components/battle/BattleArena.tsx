import type { ReactNode } from 'react';

interface BattleArenaProps {
  opponent: ReactNode;
  player: ReactNode;
  backdrop: ReactNode;
  middle: ReactNode;
  bottom: ReactNode;
}

export function BattleArena({ opponent, player, backdrop, middle, bottom }: BattleArenaProps) {
  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Combat zone: relative container for positioned cards + backdrop */}
      <div className="relative shrink-0 flex-1 lg:h-48 overflow-hidden">
        {backdrop}
        {/* Opponent card — top right */}
        <div className="absolute top-2 right-2 lg:top-3 lg:right-3 w-64 lg:w-128">
          {opponent}
        </div>
        {/* Player card — bottom left */}
        <div className="absolute bottom-2 left-2 lg:bottom-3 lg:left-3 w-64 lg:w-128">
          {player}
        </div>
      </div>
      {/* Log */}
      <div className="min-h-0 px-3 lg:px-4 pb-2">
        {middle}
      </div>
      {/* Actions */}
      <div className="shrink-0">
        {bottom}
      </div>
    </div>
  );
}
