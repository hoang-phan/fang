import { useState } from 'react';
import type { Dispatch } from 'react';
import type { GameState, PlayerStats } from '../../types';
import type { GameAction } from '../../reducers/gameReducer';
import { DEFAULT_PLAYER } from '../../reducers/gameReducer';
import { Button } from '../ui/Button';

const SPRITES = ['🧙', '🧝', '🧛', '🧟', '🧞', '🧜', '🦸', '🦹', '🥷', '🧚'];

interface PvpLobbyScreenProps {
  gameState: GameState;
  dispatch: Dispatch<GameAction>;
}

export function PvpLobbyScreen({ gameState, dispatch }: PvpLobbyScreenProps) {
  const [p2Name, setP2Name] = useState('');
  const [p2Sprite, setP2Sprite] = useState(SPRITES[1]);

  const handleStart = () => {
    const name = p2Name.trim() || 'Player 2';
    const player2: PlayerStats = {
      ...DEFAULT_PLAYER,
      name,
      sprite: p2Sprite,
      // Mirror P1's progression so the fight is fair
      maxHp: gameState.player.maxHp,
      hp: gameState.player.maxHp,
      maxMp: gameState.player.maxMp,
      mp: gameState.player.maxMp,
      baseDamage: gameState.player.baseDamage,
      baseDefense: gameState.player.baseDefense,
      stats: { ...gameState.player.stats },
      moves: [...gameState.player.moves] as PlayerStats['moves'],
      level: gameState.player.level,
    };
    dispatch({ type: 'START_PVP_BATTLE', player2 });
  };

  return (
    <div className="min-h-screen bg-theme-base flex flex-col items-center justify-center gap-6 p-6">
      <h1 className="font-pixel text-xl text-text-base">PvP Battle</h1>

      <div className="w-full max-w-sm bg-theme-surface border border-border-mid rounded-xl p-5 flex flex-col gap-4">
        {/* P1 summary (read-only) */}
        <div className="flex items-center gap-3 pb-3 border-b border-border-mid">
          <span className="text-3xl">{gameState.player.sprite}</span>
          <div>
            <p className="font-bold text-sm text-text-base">{gameState.player.name}</p>
            <p className="text-xs text-text-muted">Player 1</p>
          </div>
        </div>

        <p className="text-xs text-text-muted text-center">vs</p>

        {/* P2 configuration */}
        <div className="flex flex-col gap-3">
          <label className="text-xs text-text-muted font-semibold uppercase tracking-wide">Player 2 name</label>
          <input
            type="text"
            value={p2Name}
            onChange={e => setP2Name(e.target.value)}
            placeholder="Player 2"
            maxLength={20}
            className="w-full px-3 py-2 rounded-lg bg-theme-raised border border-border-mid text-text-base text-sm focus:outline-none focus:border-accent"
          />

          <label className="text-xs text-text-muted font-semibold uppercase tracking-wide">Sprite</label>
          <div className="flex flex-wrap gap-2">
            {SPRITES.map(s => (
              <button
                key={s}
                onClick={() => setP2Sprite(s)}
                className={`text-2xl p-1.5 rounded-lg border transition-colors ${
                  p2Sprite === s
                    ? 'border-accent bg-accent-subtle'
                    : 'border-border-mid bg-theme-raised hover:border-accent/50'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        <p className="text-xs text-text-muted text-center">
          Player 2 mirrors Player 1's stats and moves.
        </p>

        <Button fullWidth onClick={handleStart}>
          ⚔️ Start PvP Battle!
        </Button>
      </div>

      <button
        onClick={() => dispatch({ type: 'GO_TO_OPPONENT_SELECT' })}
        className="text-xs text-text-muted hover:text-text-base underline"
      >
        ← Back
      </button>
    </div>
  );
}
