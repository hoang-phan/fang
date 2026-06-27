import { useEffect } from 'react';
import type { Dispatch } from 'react';
import type { GameState, OpponentDef } from '../../types';
import type { GameAction } from '../../reducers/gameReducer';
import { Button } from '../ui/Button';
import { PlayerLoadout } from '../ui/PlayerLoadout';
import { StatsPanel } from '../ui/StatsPanel';
import { getOpponentProgress, pickWeightedRandomOpponent } from '../../utils/xp';
import { OpponentSelectHeader } from '../OpponentSelect/OpponentSelectHeader';
import { OpponentCard } from '../OpponentSelect/OpponentCard';
import { useOpponentSelectKeys } from '../../hooks/useKeyboardShortcuts';

interface OpponentSelectScreenProps {
  gameState: GameState;
  dispatch: Dispatch<GameAction>;
  opponents: OpponentDef[];
}

export function OpponentSelectScreen({ gameState, dispatch, opponents }: OpponentSelectScreenProps) {
  const { player, defeatedOpponents, selectedOpponentId, opponentProgress } = gameState;

  // Auto-pick a random opponent (weighted by inverse level) whenever none is selected — free, no gold cost.
  useEffect(() => {
    if (selectedOpponentId || opponents.length === 0) return;
    const picked = pickWeightedRandomOpponent(opponents, opponentProgress ?? {});
    if (picked) dispatch({ type: 'SELECT_OPPONENT', opponentId: picked.id });
  }, [selectedOpponentId, opponents, opponentProgress, dispatch]);

  const selectedOpponent = opponents.find(o => o.id === selectedOpponentId) ?? null;
  const rerollCost = Math.max(1, Math.floor(player.gold * 0.1));
  const canAffordReroll = player.gold >= rerollCost;

  const handleFight = () => {
    if (!selectedOpponentId || !selectedOpponent) return;
    dispatch({ type: 'START_BATTLE', opponentDef: selectedOpponent });
  };

  const handleReroll = () => {
    if (opponents.length === 0 || !canAffordReroll) return;
    const picked = pickWeightedRandomOpponent(opponents, opponentProgress ?? {});
    if (picked) dispatch({ type: 'REROLL_OPPONENT', newOpponentId: picked.id });
  };

  useOpponentSelectKeys({
    opponents: selectedOpponent ? [selectedOpponent] : [],
    selectedOpponentId,
    onNavigate: () => {},
    onFight: handleFight,
  });

  return (
    <div className="min-h-screen bg-theme-base flex flex-col">
      <OpponentSelectHeader player={player} dispatch={dispatch} />

      <div className="flex flex-col lg:flex-row flex-1 gap-0 overflow-hidden">
        {/* Sidebar: stats + loadout */}
        <div className="w-full lg:w-80 lg:order-last shrink-0 border-b lg:border-b-0 lg:border-l border-border-mid p-4 lg:overflow-y-auto bg-theme-muted/50 flex flex-col gap-4">
          <StatsPanel player={player} dispatch={dispatch} />
          <PlayerLoadout player={player} dispatch={dispatch} />

          {/* Action buttons on desktop */}
          <div className="hidden lg:flex flex-col gap-2">
            <Button fullWidth onClick={handleFight} disabled={!selectedOpponent}>
              ⚔️ Fight!
            </Button>
            <Button
              fullWidth
              variant="secondary"
              onClick={() => dispatch({ type: 'GO_TO_PVP_LOBBY' })}
            >
              🆚 PvP Hot-Seat
            </Button>
            <Button
              fullWidth
              variant="secondary"
              onClick={handleReroll}
              disabled={!canAffordReroll}
            >
              🎲 Different opponent ({rerollCost}g)
            </Button>
          </div>
        </div>

        {/* Random opponent display */}
        <div className="flex-1 p-4 lg:p-6 overflow-y-auto">
          <h2 className="font-pixel text-xs text-text-muted mb-4">Your next challenger</h2>
          {selectedOpponent ? (
            <div className="flex flex-col gap-3 max-w-xl">
              <OpponentCard
                key={selectedOpponent.id}
                opp={selectedOpponent}
                oppProgress={getOpponentProgress(opponentProgress, selectedOpponent.id, selectedOpponent.level)}
                unlocked={true}
                defeated={defeatedOpponents.includes(selectedOpponent.id)}
                selected={true}
                interactive={false}
                dispatch={dispatch}
              />
            </div>
          ) : (
            <p className="text-text-muted text-sm">Finding an opponent…</p>
          )}
        </div>
      </div>

      {/* Action buttons — sticky at bottom on mobile */}
      <div className="lg:hidden sticky bottom-0 p-4 bg-theme-base border-t border-border-mid flex gap-2">
        <Button
          variant="secondary"
          onClick={handleReroll}
          disabled={!canAffordReroll}
          className="shrink-0"
        >
          🎲 {rerollCost}g
        </Button>
        <Button
          variant="secondary"
          onClick={() => dispatch({ type: 'GO_TO_PVP_LOBBY' })}
          className="shrink-0"
        >
          🆚
        </Button>
        <Button fullWidth onClick={handleFight} disabled={!selectedOpponent}>
          ⚔️ Fight!
        </Button>
      </div>
    </div>
  );
}
