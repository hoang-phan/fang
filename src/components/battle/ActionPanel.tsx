import type { PlayerStats, ElementType } from '../../types';
import { MoveButton } from './MoveButton';

interface ActionPanelProps {
  player: PlayerStats;
  isPlayerTurn: boolean;
  opponentType?: ElementType;
  onAttack: () => void;
  onSpecial: (slot: 0 | 1 | 2 | 3) => void;
}

export function ActionPanel({ player, isPlayerTurn, onAttack, onSpecial }: ActionPanelProps) {
  return (
    <div className="bg-theme-base border-t border-border-mid p-3 lg:p-4 flex flex-col gap-2 lg:gap-3">
      {/* Attack button */}
      <button
        onClick={onAttack}
        disabled={!isPlayerTurn}
        className={`
          w-full py-2 lg:py-3 rounded-lg font-bold text-sm transition-all duration-150 flex items-center justify-center gap-2
          ${isPlayerTurn
            ? 'bg-accent hover:bg-accent-hover text-accent-text cursor-pointer'
            : 'bg-theme-raised text-text-faint cursor-not-allowed opacity-50'
          }
        `}
      >
        <span>⚔️</span>
        <span>ATTACK</span>
        <span className="text-xs opacity-70 ml-1">free</span>
      </button>

      {/* Special slots */}
      <div className="grid grid-cols-2 gap-2">
        {player.moves.map((move, i) => (
          <MoveButton
            key={i}
            move={move}
            playerMp={player.mp}
            disabled={!isPlayerTurn}
            onClick={() => onSpecial(i as 0 | 1 | 2 | 3)}
          />
        ))}
      </div>
    </div>
  );
}
