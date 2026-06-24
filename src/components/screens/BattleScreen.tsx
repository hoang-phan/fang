import type { Dispatch } from 'react';
import { useEffect, useRef } from 'react';
import type { BattleState, OpponentDef } from '../../types';
import type { GameAction } from '../../reducers/gameReducer';
import { useBattle } from '../../hooks/useBattle';
import { useBattleKeys } from '../../hooks/useKeyboardShortcuts';
import { BattleArena } from '../battle/BattleArena';
import { CombatantCard } from '../battle/CombatantCard';
import { BattleLog } from '../battle/BattleLog';
import { ActionPanel } from '../battle/ActionPanel';

interface BattleScreenProps {
  initialBattleState: BattleState;
  opponents: OpponentDef[];
  gameDispatch: Dispatch<GameAction>;
}

function getAvatarUrl(opp: OpponentDef, level: number): string | undefined {
  const avatars = opp.avatars;
  if (!avatars?.length) return undefined;
  const idx = Math.min(level, 5) - 1;
  return avatars[idx] ?? avatars[avatars.length - 1];
}

export function BattleScreen({ initialBattleState, opponents, gameDispatch }: BattleScreenProps) {
  const { state, dispatch, isPlayerTurn } = useBattle(initialBattleState);
  const victoryFired = useRef(false);
  const defeatFired = useRef(false);
  const goldSeed = useRef(Math.random()).current;

  useBattleKeys({
    isPlayerTurn,
    moves: state.player.moves,
    playerMp: state.player.mp,
    onAttack: () => dispatch({ type: 'USE_ATTACK' }),
    onSpecial: (slot) => dispatch({ type: 'USE_SPECIAL', slotIndex: slot }),
  });

  useEffect(() => {
    if (state.phase === 'victory' && !victoryFired.current) {
      victoryFired.current = true;
      setTimeout(() => {
        gameDispatch({ type: 'BATTLE_VICTORY', finalBattleState: state, goldSeed });
      }, 1200);
    }
  }, [state.phase]);

  useEffect(() => {
    if (state.phase === 'defeat' && !defeatFired.current) {
      defeatFired.current = true;
      setTimeout(() => {
        gameDispatch({ type: 'BATTLE_DEFEAT' });
      }, 1200);
    }
  }, [state.phase]);

  const opponentFlashing = state.lastPlayerDamage != null;
  const playerFlashing = state.lastOpponentDamage != null;

  const phaseLabel = (() => {
    switch (state.phase) {
      case 'player_turn': return 'Your turn';
      case 'resolving': return `${state.opponent.def.name} is readying...`;
      case 'opponent_turn': return `${state.opponent.def.name} attacks!`;
      case 'victory': return '🏆 Victory!';
      case 'defeat': return '💀 Defeated!';
    }
  })();

  return (
    <div className="h-screen flex flex-col bg-theme-base relative">
      {/* Header */}
      <div className="shrink-0 bg-theme-surface border-b border-border-mid px-3 lg:px-4 py-2 flex items-center justify-between gap-2">
        <span className="font-pixel text-xs text-text-muted">Turn {state.turn}</span>
        <span className={`font-mono text-sm font-bold ${
          state.phase === 'victory' ? 'text-accent' :
          state.phase === 'defeat' ? 'text-red-400' :
          isPlayerTurn ? 'text-green-400' : 'text-orange-400'
        }`}>
          {phaseLabel}
        </span>
        <span className="font-mono text-xs text-accent">💰 {state.player.gold}g</span>
      </div>

      {/* Victory / defeat overlay */}
      {(state.phase === 'victory' || state.phase === 'defeat') && (
        <div className={`absolute inset-0 z-40 flex items-center justify-center pointer-events-none ${
          state.phase === 'victory' ? 'bg-accent-subtle/40' : 'bg-red-900/30'
        }`}>
          <div className="text-6xl animate-bounce">
            {state.phase === 'victory' ? '🏆' : '💀'}
          </div>
        </div>
      )}

      <BattleArena
        top={
          <>
            <div className="flex-1">
              <CombatantCard
                name={state.opponent.def.name}
                sprite={state.opponent.def.sprite}
                avatarUrl={getAvatarUrl(
                  opponents.find(o => o.id === state.opponent.def.id) ?? state.opponent.def,
                  state.opponent.def.level,
                )}
                hp={state.opponent.hp}
                maxHp={state.opponent.def.maxHp}
                isFlashing={opponentFlashing}
                side="opponent"
              />
            </div>
            <div className="flex-1">
              <CombatantCard
                name={state.player.name}
                sprite={state.player.sprite}
                hp={state.player.hp}
                maxHp={state.player.maxHp}
                mp={state.player.mp}
                maxMp={state.player.maxMp}
                isFlashing={playerFlashing}
                side="player"
              />
            </div>
          </>
        }
        middle={<BattleLog entries={state.log} />}
        bottom={
          <ActionPanel
            player={state.player}
            isPlayerTurn={isPlayerTurn}
            opponentType={state.opponent.def.type}
            dispatch={dispatch}
          />
        }
      />
    </div>
  );
}
