import type { Dispatch } from 'react';
import type { PlayerStats, ElementType } from '../../types';
import type { BattleAction } from '../../reducers/battleReducer';
import { MoveButton } from './MoveButton';

interface ActionPanelProps {
  player: PlayerStats;
  isPlayerTurn: boolean;
  opponentType?: ElementType;
  dispatch: Dispatch<BattleAction>;
}

export function ActionPanel({ player, isPlayerTurn, opponentType, dispatch }: ActionPanelProps) {
  return (
    <div className="bg-theme-base border-t border-border-mid p-4 flex flex-col gap-3">
      {/* Attack button */}
      <button
        onClick={() => dispatch({ type: 'USE_ATTACK' })}
        disabled={!isPlayerTurn}
        className={`
          w-full py-3 rounded-lg font-bold text-sm transition-all duration-150 flex items-center justify-center gap-2
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
            onClick={() => dispatch({ type: 'USE_SPECIAL', slotIndex: i as 0 | 1 | 2 | 3 })}
          />
        ))}
      </div>
    </div>
  );
}
