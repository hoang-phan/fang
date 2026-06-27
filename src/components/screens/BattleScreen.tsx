import type { Dispatch } from 'react';
import { useEffect, useRef } from 'react';
import type { BattleState, OpponentDef } from '../../types';
import type { GameAction } from '../../reducers/gameReducer';
import { useBattle } from '../../hooks/useBattle';
import { useBattleKeys, useP2BattleKeys } from '../../hooks/useKeyboardShortcuts';
import { BattleArena } from '../battle/BattleArena';
import { CombatantCard } from '../battle/CombatantCard';
import { BattleLog } from '../battle/BattleLog';
import { ActionPanel } from '../battle/ActionPanel';
import { ELEMENT_COLORS } from '../../utils/color';
import { TYPE_ICONS } from '../../utils/damage';

interface BattleScreenProps {
  initialBattleState: BattleState;
  opponents: OpponentDef[];
  gameDispatch: Dispatch<GameAction>;
}


export function BattleScreen({ initialBattleState, opponents, gameDispatch }: BattleScreenProps) {
  const { state, dispatch, isPlayerTurn, isP2Turn, isHandoff } = useBattle(initialBattleState);
  const victoryFired = useRef(false);
  const defeatFired = useRef(false);
  const goldSeed = useRef(Math.random()).current;

  const isPvP = state.mode === 'pvp';
  const p2 = state.player2;

  useBattleKeys({
    isPlayerTurn: isPlayerTurn && !isHandoff,
    moves: state.player.moves,
    playerMp: state.player.mp,
    onAttack: () => dispatch({ type: 'USE_ATTACK' }),
    onSpecial: (slot) => dispatch({ type: 'USE_SPECIAL', slotIndex: slot }),
  });

  useP2BattleKeys({
    isP2Turn,
    moves: p2?.moves ?? [null, null, null, null],
    playerMp: p2?.mp ?? 0,
    onAttack: () => dispatch({ type: 'P2_USE_ATTACK' }),
    onSpecial: (slot) => dispatch({ type: 'P2_USE_SPECIAL', slotIndex: slot }),
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

  const opponentDamaged = state.lastPlayerDamage != null && state.lastPlayerDamage > 0;
  const playerDamaged = state.lastOpponentDamage != null && state.lastOpponentDamage > 0;
  const attackColor = state.lastAttackElement ? ELEMENT_COLORS[state.lastAttackElement] : undefined;

  const playerShieldEffect = state.activeEffects.find(e => e.target === 'player' && e.defense > 0);
  const opponentShieldEffect = state.activeEffects.find(e => e.target === 'opponent' && e.defense > 0);
  const playerHasShield = playerShieldEffect != null;
  const opponentHasShield = opponentShieldEffect != null;
  const playerShieldColor = playerShieldEffect ? ELEMENT_COLORS[playerShieldEffect.sourceType] : undefined;
  const opponentShieldColor = opponentShieldEffect ? ELEMENT_COLORS[opponentShieldEffect.sourceType] : undefined;

  const playerShieldJustApplied = state.activeEffects.some(e => e.target === 'player' && e.defense > 0 && e.skipFirstTick);
  const opponentShieldJustApplied = state.activeEffects.some(e => e.target === 'opponent' && e.defense > 0 && e.skipFirstTick);

  const playerBoostEffect = state.activeEffects.find(e => e.target === 'player' && e.boostKind != null);
  const opponentBoostEffect = state.activeEffects.find(e => e.target === 'opponent' && e.boostKind != null);
  const playerHasBoost = playerBoostEffect != null;
  const opponentHasBoost = opponentBoostEffect != null;
  const playerBoostColor = playerBoostEffect ? ELEMENT_COLORS[playerBoostEffect.sourceType] : undefined;
  const opponentBoostColor = opponentBoostEffect ? ELEMENT_COLORS[opponentBoostEffect.sourceType] : undefined;

  const playerBoostJustApplied = state.activeEffects.some(e => e.target === 'player' && e.boostKind != null && e.skipFirstTick);
  const opponentBoostJustApplied = state.activeEffects.some(e => e.target === 'opponent' && e.boostKind != null && e.skipFirstTick);

  // Flash keys increment each time damage is received to replay the animation
  const playerFlashKey = playerDamaged ? state.turn : null;
  const opponentFlashKey = opponentDamaged ? state.turn : null;

  const phaseLabel = (() => {
    switch (state.phase) {
      case 'player_turn': return isPvP ? `${state.player.name}'s turn` : 'Your turn';
      case 'resolving': return isPvP ? 'Passing to next player...' : `${state.opponent.def.name} is readying...`;
      case 'handoff': return `Ready, ${p2?.name ?? 'Player 2'}?`;
      case 'p2_turn': return `${p2?.name ?? 'Player 2'}'s turn`;
      case 'opponent_turn': return isPvP ? 'Resolving...' : `${state.opponent.def.name} attacks!`;
      case 'victory': return isPvP ? `${state.player.name} wins!` : '🏆 Victory!';
      case 'defeat': return isPvP ? `${p2?.name ?? 'Player 2'} wins!` : '💀 Defeated!';
    }
  })();

  const backdropKey = `${state.turn}-${state.lastAttackSide ?? 'none'}`;

  return (
    <div className="h-screen flex flex-col bg-theme-base relative">
      {/* Header */}
      <div className="shrink-0 bg-theme-surface border-b border-border-mid px-3 lg:px-4 py-2 flex items-center justify-between gap-2">
        <span className="font-pixel text-xs text-text-muted">Turn {state.turn}</span>
        <span className={`font-mono text-sm font-bold ${
          state.phase === 'victory' ? 'text-accent' :
          state.phase === 'defeat' ? 'text-red-400' :
          (isPlayerTurn || isP2Turn) ? 'text-green-400' : 'text-orange-400'
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
            {state.phase === 'victory' ? '🏆' : isPvP ? '🏆' : '💀'}
          </div>
        </div>
      )}

      {/* PvP handoff interstitial — covers the screen so P2 can't read P1's state */}
      {isHandoff && p2 && (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-theme-base gap-6">
          <div className="text-4xl">{p2.sprite}</div>
          <p className="font-pixel text-lg text-text-base text-center px-8">
            Pass the device to<br /><span className="text-accent">{p2.name}</span>
          </p>
          <button
            onClick={() => dispatch({ type: 'P2_READY' })}
            className="px-8 py-3 rounded-lg bg-accent hover:bg-accent-hover text-accent-text font-bold text-sm"
          >
            Ready!
          </button>
        </div>
      )}

      <BattleArena
        opponent={
          <CombatantCard
            name={state.opponent.def.name}
            sprite={state.opponent.def.sprite}
            avatarUrl={(opponents.find(o => o.id === state.opponent.def.id) ?? state.opponent.def).avatar}
            hp={state.opponent.hp}
            maxHp={state.opponent.def.maxHp}
            damageFlashKey={opponentFlashKey}
            damageFlashColor={attackColor}
            hasShield={opponentHasShield}
            shieldFlashKey={opponentShieldJustApplied ? state.turn : null}
            shieldColor={opponentShieldColor}
            hasBoost={opponentHasBoost}
            boostFlashKey={opponentBoostJustApplied ? state.turn : null}
            boostColor={opponentBoostColor}
            side="opponent"
          />
        }
        player={
          <CombatantCard
            name={state.player.name}
            sprite={state.player.sprite}
            hp={state.player.hp}
            maxHp={state.player.maxHp}
            mp={state.player.mp}
            maxMp={state.player.maxMp}
            damageFlashKey={playerFlashKey}
            damageFlashColor={attackColor}
            hasShield={playerHasShield}
            shieldFlashKey={playerShieldJustApplied ? state.turn : null}
            shieldColor={playerShieldColor}
            hasBoost={playerHasBoost}
            boostFlashKey={playerBoostJustApplied ? state.turn : null}
            boostColor={playerBoostColor}
            side="player"
          />
        }
        backdrop={
          attackColor && state.lastAttackSide && (opponentDamaged || playerDamaged) ? (
            <div
              key={backdropKey}
              className={`absolute inset-0 pointer-events-none z-10 flex items-center justify-center ${
                state.lastAttackSide === 'player' ? 'attack-backdrop-up' : 'attack-backdrop-down'
              }`}
              style={{ backgroundColor: attackColor }}
            >
              <span
                className="select-none leading-none"
                style={{ fontSize: '20rem', opacity: 0.2 }}
              >
                {state.lastAttackElement ? TYPE_ICONS[state.lastAttackElement] : null}
              </span>
            </div>
          ) : null
        }
        middle={<BattleLog entries={state.log} />}
        bottom={
          isP2Turn && p2 ? (
            <ActionPanel
              player={p2}
              isPlayerTurn={true}
              opponentType={state.opponent.def.type}
              onAttack={() => dispatch({ type: 'P2_USE_ATTACK' })}
              onSpecial={(slot) => dispatch({ type: 'P2_USE_SPECIAL', slotIndex: slot })}
            />
          ) : (
            <ActionPanel
              player={state.player}
              isPlayerTurn={isPlayerTurn}
              opponentType={state.opponent.def.type}
              onAttack={() => dispatch({ type: 'USE_ATTACK' })}
              onSpecial={(slot) => dispatch({ type: 'USE_SPECIAL', slotIndex: slot })}
            />
          )
        }
      />
    </div>
  );
}
