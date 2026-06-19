import type { Dispatch } from 'react';
import type { GameState, OpponentDef } from '../../types';
import type { GameAction } from '../../reducers/gameReducer';
import { GoldDisplay } from '../ui/GoldDisplay';

import { Button } from '../ui/Button';
import { ProgressBar } from '../ui/ProgressBar';
import { PlayerLoadout } from '../ui/PlayerLoadout';
import { StatsPanel } from '../ui/StatsPanel';
import { getTypeIcon } from '../../utils/damage';
import { getOpponentProgress, getScaledOpponent, xpToNextLevel } from '../../utils/xp';

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
      {/* Header */}
      <div className="bg-theme-surface border-b border-border-mid px-6 py-4 flex items-center justify-between">
        <h1 className="font-pixel text-accent text-sm">⚔️ FANG</h1>
        <div className="flex items-center gap-4">
          <div className="text-xs font-mono text-text-normal">
            <span className="text-accent font-pixel">Lv {player.level}</span>
            <span className="mx-2 text-text-faint">|</span>
            <span className="text-green-400">{player.hp}</span>/{player.maxHp} HP
            <span className="mx-2 text-text-faint">|</span>
            <span className="text-blue-400">{player.mp}</span>/{player.maxMp} MP
          </div>
          <GoldDisplay gold={player.gold} />
          <Button variant="ghost" onClick={() => dispatch({ type: 'GO_TO_SHOP' })}>
            🛒 Shop
          </Button>
        </div>
      </div>

      <div className="flex flex-1 gap-0 overflow-hidden">
        {/* Opponent list */}
        <div className="flex-1 p-6 overflow-y-auto">
          <h2 className="font-pixel text-xs text-text-muted mb-4">Choose your opponent</h2>
          <div className="flex flex-col gap-3">
            {opponents.map(opp => {
              const unlocked = isUnlocked(opp.id);
              const defeated = defeatedOpponents.includes(opp.id);
              const selected = selectedOpponentId === opp.id;
              const oppProgress = getOpponentProgress(opponentProgress, opp.id, opp.level);
              const scaled = getScaledOpponent(opp, oppProgress);
              const xpNeeded = xpToNextLevel(oppProgress.level);

              return (
                <button
                  key={opp.id}
                  disabled={!unlocked}
                  onClick={() => dispatch({ type: 'SELECT_OPPONENT', opponentId: opp.id })}
                  className={`
                    w-full text-left rounded-xl border p-4 transition-all duration-150 cursor-pointer
                    ${!unlocked ? 'opacity-40 cursor-not-allowed border-border-mid bg-theme-surface/30' :
                      selected ? 'border-accent bg-accent-subtle' :
                      'border-border-strong bg-theme-surface/60 hover:border-text-faint'
                    }
                  `}
                >
                  <div className="flex items-center gap-3">
                    {(() => {
                      if (!unlocked) return <span className="text-4xl">🔒</span>;
                      const avatars = opp.avatars;
                      const avatarUrl = avatars?.length
                        ? avatars[Math.min(oppProgress.level, 5) - 1] ?? avatars[avatars.length - 1]
                        : undefined;
                      return avatarUrl
                        ? <img src={avatarUrl} alt={opp.name} className="w-24 h-24 object-contain" />
                        : <span className="text-4xl">{opp.sprite}</span>;
                    })()}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-bold text-text-bright text-sm">{opp.name}</span>
                        <span className="text-xs text-purple-400 font-pixel">Lv {oppProgress.level}</span>
                        {defeated && <span className="text-xs text-green-400">✓ Defeated</span>}
                        {!unlocked && <span className="text-xs text-text-faint">Locked</span>}
                      </div>
                      <p className="text-xs text-text-muted truncate">{opp.flavourText}</p>
                      <div className="flex items-center gap-3 mt-2">
                        <div className="w-24">
                          <ProgressBar label="HP" value={scaled.maxHp} max={scaled.maxHp} autoColor />
                        </div>
                        <span className="text-xs text-accent">💰 {opp.goldReward[0]}–{opp.goldReward[1]}g</span>
                        <span className="text-xs text-text-muted">⭐ {opp.xpReward[0]} XP</span>
                        <span className="text-sm">{getTypeIcon(opp.type)}</span>
                      </div>
                      <div className="mt-2 flex items-center gap-2">
                        <div className="flex-1">
                          <ProgressBar label="" value={oppProgress.xp} max={xpNeeded} color="bg-purple-500" />
                        </div>
                        <span className="text-xs text-text-faint">{oppProgress.xp}/{xpNeeded} XP</span>
                      </div>
                    </div>
                    {selected && <span className="text-accent text-xl">▶</span>}
                  </div>
                </button>
              );
            })}
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
