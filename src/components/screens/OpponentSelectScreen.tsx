import type { Dispatch } from 'react';
import type { GameState, OpponentDef } from '../../types';
import type { GameAction } from '../../reducers/gameReducer';
import { Button } from '../ui/Button';
import { PlayerLoadout } from '../ui/PlayerLoadout';
import { StatsPanel } from '../ui/StatsPanel';
import { getOpponentProgress } from '../../utils/xp';
import { OpponentSelectHeader } from '../OpponentSelect/OpponentSelectHeader';
import { OpponentCard } from '../OpponentSelect/OpponentCard';

interface OpponentSelectScreenProps {
  gameState: GameState;
  dispatch: Dispatch<GameAction>;
  opponents: OpponentDef[];
}

export function OpponentSelectScreen({ gameState, dispatch, opponents }: OpponentSelectScreenProps) {
  const { player, defeatedOpponents, selectedOpponentId, opponentProgress } = gameState;

  const isUnlocked = (opponentId: string) => {
    const opp = opponents.find(o => o.id === opponentId);
    if (!opp?.unlockAfter) return true;
    return opp.unlockAfter.every(id => defeatedOpponents.includes(id));
  };

  const handleFight = () => {
    if (!selectedOpponentId) return;
    const opponentDef = opponents.find(o => o.id === selectedOpponentId);
    if (!opponentDef) return;
    dispatch({ type: 'START_BATTLE', opponentDef });
  };

  return (
    <div className="min-h-screen bg-theme-base flex flex-col">
      <OpponentSelectHeader player={player} dispatch={dispatch} />

      <div className="flex flex-1 gap-0 overflow-hidden">
        {/* Opponent list */}
        <div className="flex-1 p-6 overflow-y-auto">
          <h2 className="font-pixel text-xs text-text-muted mb-4">Choose your opponent</h2>
          <div className="flex flex-col gap-3">
            {opponents.map(opp => (
              <OpponentCard
                key={opp.id}
                opp={opp}
                oppProgress={getOpponentProgress(opponentProgress, opp.id, opp.level)}
                unlocked={isUnlocked(opp.id)}
                defeated={defeatedOpponents.includes(opp.id)}
                selected={selectedOpponentId === opp.id}
                dispatch={dispatch}
              />
            ))}
          </div>
        </div>

        {/* Sidebar: player loadout + stats */}
        <div className="w-80 shrink-0 border-l border-border-mid p-4 overflow-y-auto bg-theme-muted/50 flex flex-col gap-4">
          <StatsPanel player={player} dispatch={dispatch} />
          <PlayerLoadout player={player} dispatch={dispatch} />

          {selectedOpponentId && (
            <Button fullWidth onClick={handleFight}>
              ⚔️ Fight!
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
