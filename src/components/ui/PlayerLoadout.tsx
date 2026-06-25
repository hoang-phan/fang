import { useState } from 'react';
import type { Dispatch } from 'react';
import type { PlayerStats, Move } from '../../types';
import type { GameAction } from '../../reducers/gameReducer';
import { getTypeIcon } from '../../utils/damage';

interface PlayerLoadoutProps {
  player: PlayerStats;
  dispatch: Dispatch<GameAction>;
}

export function PlayerLoadout({ player, dispatch }: PlayerLoadoutProps) {
  // Which pool move is currently in "pick a slot to swap into" mode
  const [swapping, setSwapping] = useState<string | null>(null);

  const handleSwap = (poolMove: Move, slot: 0 | 1 | 2 | 3) => {
    dispatch({ type: 'EQUIP_MOVE', move: poolMove, slot });
    setSwapping(null);
  };

  const handleUnlearn = (moveId: string) => {
    dispatch({ type: 'UNLEARN_MOVE', moveId });
    if (swapping === moveId) setSwapping(null);
  };

  return (
    <div className="bg-theme-surface border border-border-mid rounded-xl p-4">
      <h3 className="font-pixel text-xs text-text-normal mb-3">Active Skills</h3>

      <div className="grid grid-cols-2 gap-2 mb-4">
        {player.moves.map((move, i) => {
          const isSwapTarget = swapping !== null;
          return (
            <div
              key={i}
              onClick={() => isSwapTarget && handleSwap(player.learnedPool.find(m => m.id === swapping)!, i as 0 | 1 | 2 | 3)}
              className={`
                border rounded-lg p-2 bg-theme-raised/50 min-h-[64px] flex flex-col justify-between
                ${isSwapTarget
                  ? 'border-accent cursor-pointer hover:bg-accent-subtle transition-colors'
                  : 'border-border-strong'
                }
              `}
            >
              {move ? (
                <>
                  <div className="flex items-center gap-1">
                    <span>{getTypeIcon(move.type)}</span>
                    <span className="text-xs text-text-bright truncate flex-1">{move.name}</span>
                    {move.level > 1 && <span className="text-xs text-accent-muted">Lv{move.level}</span>}
                  </div>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-xs text-blue-400">{move.mpCost} MP</span>
                    {isSwapTarget && <span className="text-xs text-accent">← swap</span>}
                  </div>
                </>
              ) : (
                <div className="text-center text-text-faint text-xs my-auto">
                  {isSwapTarget ? '← put here' : `Slot ${i + 1}`}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Pool */}
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-pixel text-xs text-text-muted">Backup Skills</h3>
        <span className="text-xs text-text-faint">{player.learnedPool.length}/2</span>
      </div>

      {player.learnedPool.length === 0 ? (
        <p className="text-xs text-text-faint italic">No backup skills</p>
      ) : (
        <div className="flex flex-col gap-2">
          {player.learnedPool.map(move => {
            const isThisSwapping = swapping === move.id;
            return (
              <div key={move.id} className={`flex items-center gap-2 rounded-lg p-2 ${isThisSwapping ? 'bg-accent-subtle border border-accent' : 'bg-theme-raised/40'}`}>
                <span>{getTypeIcon(move.type)}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-xs text-text-bright truncate">{move.name}</div>
                  <div className="flex items-center gap-1">
                    <span className="text-xs text-blue-400">{move.mpCost} MP</span>
                    {move.level > 1 && <span className="text-xs text-accent-muted">Lv{move.level}</span>}
                  </div>
                </div>
                <div className="flex gap-1 shrink-0">
                  {isThisSwapping ? (
                    <button
                      onClick={() => setSwapping(null)}
                      className="text-xs px-2 py-1 bg-theme-raised hover:bg-theme-hover text-text-muted rounded cursor-pointer"
                    >
                      cancel
                    </button>
                  ) : (
                    <button
                      onClick={() => setSwapping(move.id)}
                      className="text-xs px-2 py-1 bg-purple-800 hover:bg-purple-700 text-purple-200 rounded cursor-pointer"
                    >
                      swap
                    </button>
                  )}
                  <button
                    onClick={() => handleUnlearn(move.id)}
                    className="text-xs px-2 py-1 bg-red-900/60 hover:bg-red-800/80 text-red-300 rounded cursor-pointer"
                  >
                    forget
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {swapping && (
        <p className="text-xs text-accent mt-2">Pick an active slot to swap into</p>
      )}

      {!swapping && player.learnedPool.length === 0 && player.moves.every(m => m === null) && (
        <p className="text-xs text-text-faint mt-1 italic">Learn skills from defeated opponents</p>
      )}
    </div>
  );
}
