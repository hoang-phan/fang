import { useState } from 'react';
import type { Dispatch } from 'react';
import type { GameAction } from '../../reducers/gameReducer';
import type { GameState, OpponentDef, OpponentCinematic } from '../../types';
import { getRelationshipProgress } from '../../utils/xp';
import { CinematicsModal } from '../Gallery/CinematicsModal';
import { CinematicCard } from '../Gallery/CinematicCard';

interface Props {
  gameState: GameState;
  opponents: OpponentDef[];
  dispatch: Dispatch<GameAction>;
}

interface UnlockedCinematic {
  opponent: OpponentDef;
  cinematic: OpponentCinematic;
}

export function GalleryScreen({ gameState, opponents, dispatch }: Props) {
  const [viewing, setViewing] = useState<UnlockedCinematic | null>(null);

  const unlocked: UnlockedCinematic[] = [];
  for (const opponent of opponents) {
    if (!opponent.cinematics?.length) continue;
    const rel = getRelationshipProgress(gameState.relationshipProgress, opponent.id);
    for (const cinematic of opponent.cinematics) {
      if (rel.level >= cinematic.level - 1) {
        unlocked.push({ opponent, cinematic });
      }
    }
  }

  function handleBack() {
    dispatch({ type: 'GO_TO_START_SCREEN' });
  }

  return (
    <div className="min-h-screen bg-theme-base flex flex-col">
      <div className="flex items-center gap-4 px-4 py-4 bg-theme-raised border-b border-border-mid">
        <button
          onClick={handleBack}
          className="font-pixel text-text-muted hover:text-text-bright text-xs transition-colors"
        >
          ← BACK
        </button>
        <h1 className="font-pixel text-text-bright text-xs tracking-wider">GALLERY</h1>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-6">
        {unlocked.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-4 mt-16">
            <p className="font-pixel text-text-muted text-xs text-center leading-loose">
              No cinematics unlocked yet.
            </p>
            <p className="font-pixel text-text-faint text-xs text-center leading-loose">
              Build relationships with opponents<br />to unlock their stories.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 max-w-2xl mx-auto">
            {unlocked.map(({ opponent, cinematic }) => (
              <CinematicCard
                key={`${opponent.id}-${cinematic.level}`}
                opponent={opponent}
                cinematic={cinematic}
                onClick={() => setViewing({ opponent, cinematic })}
              />
            ))}
          </div>
        )}
      </div>

      {viewing && (
        <CinematicsModal
          cinematic={viewing.cinematic}
          opponentSprite={viewing.opponent.sprite}
          opponentName={viewing.opponent.name}
          heroName={gameState.player.name}
          onClose={() => setViewing(null)}
        />
      )}
    </div>
  );
}

