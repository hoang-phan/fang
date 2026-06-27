import { useReducer, useEffect, type Dispatch } from 'react';
import type { BattleState } from '../types';
import { battleReducer, type BattleAction } from '../reducers/battleReducer';

export function useBattle(initialState: BattleState) {
  const [state, dispatch] = useReducer(battleReducer, initialState);

  useEffect(() => {
    // In PvP, 'resolving' just transitions to 'handoff' — still auto-fired but instant
    if (state.phase === 'resolving') {
      const delay = state.mode === 'pvp' ? 400 : 2000;
      const timer = setTimeout(() => dispatch({ type: 'OPPONENT_TURN_RESOLVE' }), delay);
      return () => clearTimeout(timer);
    }
    if (state.phase === 'opponent_turn') {
      const timer = setTimeout(() => dispatch({ type: 'TICK_RESOLVE' }), 700);
      return () => clearTimeout(timer);
    }
    if (state.phase === 'player_turn' && state.playerStunned) {
      const timer = setTimeout(() => dispatch({ type: 'PLAYER_STUN_SKIP' }), 700);
      return () => clearTimeout(timer);
    }
    if (state.phase === 'p2_turn' && state.player2Stunned) {
      const timer = setTimeout(() => dispatch({ type: 'P2_STUN_SKIP' }), 700);
      return () => clearTimeout(timer);
    }
  }, [state.phase, state.playerStunned, state.player2Stunned, state.mode]);

  const isPlayerTurn = state.phase === 'player_turn';
  const isP2Turn = state.phase === 'p2_turn';
  const isHandoff = state.phase === 'handoff';
  const playerHpPct = (state.player.hp / state.player.maxHp) * 100;
  const playerMpPct = (state.player.mp / state.player.maxMp) * 100;
  const opponentHpPct = (state.opponent.hp / state.opponent.def.maxHp) * 100;

  return {
    state,
    dispatch: dispatch as Dispatch<BattleAction>,
    isPlayerTurn,
    isP2Turn,
    isHandoff,
    playerHpPct,
    playerMpPct,
    opponentHpPct,
  };
}
