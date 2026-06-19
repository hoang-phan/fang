import type { Dispatch } from 'react';
import type { PlayerStats, Move } from '../../types';
import type { GameAction } from '../../reducers/gameReducer';
import { getTypeIcon, moveDamageRange } from '../../utils/damage';

interface PlayerLoadoutProps {
  player: PlayerStats;
  dispatch: Dispatch<GameAction>;
}

export function PlayerLoadout({ player, dispatch }: PlayerLoadoutProps) {
  const handleEquip = (move: Move, slot: 0 | 1 | 2 | 3) => {
    dispatch({ type: 'EQUIP_MOVE', move, slot });
  };
  const handleUnequip = (slot: 0 | 1 | 2 | 3) => {
    dispatch({ type: 'UNEQUIP_MOVE', slot });
  };

  return (
    <div className="bg-theme-surface border border-border-mid rounded-xl p-4">
      <h3 className="font-pixel text-xs text-text-normal mb-3">Equipped Specials</h3>

      <div className="grid grid-cols-2 gap-2 mb-4">
        {player.moves.map((move, i) => (
          <div
            key={i}
            className="border border-border-strong rounded-lg p-2 bg-theme-raised/50 min-h-[64px] flex flex-col justify-between"
          >
            {move ? (
              <>
                <div className="flex items-center gap-1">
                  <span>{getTypeIcon(move.type)}</span>
                  <span className="text-xs text-text-bright truncate flex-1">{move.name}</span>
                  {move.level > 1 && <span className="text-xs text-accent-muted">Lv{move.level}</span>}
                </div>
                <div className="flex items-center justify-between mt-1">
                  <div className="flex items-center gap-1">
                    <span className="text-xs text-blue-400">{move.mpCost} MP</span>
                    {(() => { const r = moveDamageRange(move, player.stats); return r && (
                      move.baseDamage > 0
                        ? <span className="text-xs text-orange-400">{r.min === r.max ? r.min : `${r.min}–${r.max}`}</span>
                        : <span className="text-xs text-green-400">+{r.min === r.max ? Math.abs(r.min) : `${Math.abs(r.max)}–${Math.abs(r.min)}`}</span>
                    ); })()}
                  </div>
                  <button
                    onClick={() => handleUnequip(i as 0 | 1 | 2 | 3)}
                    className="text-xs text-red-400 hover:text-red-300 cursor-pointer"
                  >
                    remove
                  </button>
                </div>
              </>
            ) : (
              <div className="text-center text-text-faint text-xs my-auto">Empty slot {i + 1}</div>
            )}
          </div>
        ))}
      </div>

      {player.learnedPool.length > 0 && (
        <>
          <h3 className="font-pixel text-xs text-text-muted mb-2">Move Pool</h3>
          <div className="flex flex-col gap-2 max-h-40 overflow-y-auto">
            {player.learnedPool.map(move => (
              <div key={move.id} className="flex items-center gap-2 bg-theme-raised/40 rounded-lg p-2">
                <span>{getTypeIcon(move.type)}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-xs text-text-bright truncate">{move.name}</div>
                  <div className="flex items-center gap-1">
                    <span className="text-xs text-blue-400">{move.mpCost} MP</span>
                    {(() => { const r = moveDamageRange(move, player.stats); return r && (
                      move.baseDamage > 0
                        ? <span className="text-xs text-orange-400">{r.min === r.max ? r.min : `${r.min}–${r.max}`}</span>
                        : <span className="text-xs text-green-400">+{r.min === r.max ? Math.abs(r.min) : `${Math.abs(r.max)}–${Math.abs(r.min)}`}</span>
                    ); })()}
                  </div>
                </div>
                {move.level > 1 && <span className="text-xs text-accent-muted">Lv{move.level}</span>}
                <div className="flex gap-1">
                  {player.moves.map((_, slot) => (
                    <button
                      key={slot}
                      onClick={() => handleEquip(move, slot as 0 | 1 | 2 | 3)}
                      className="text-xs px-2 py-1 bg-purple-800 hover:bg-purple-700 text-purple-200 rounded cursor-pointer"
                    >
                      {slot + 1}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <p className="text-xs text-text-faint mt-1">Click a slot number to equip to that slot</p>
        </>
      )}
    </div>
  );
}
