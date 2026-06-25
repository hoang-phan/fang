import { useReducer, useEffect, type Dispatch } from 'react';
import type { BattleState } from '../types';
import { battleReducer, type BattleAction } from '../reducers/battleReducer';

export function useBattle(initialState: BattleState) {
  const [state, dispatch] = useReducer(battleReducer, initialState);

  useEffect(() => {
    if (state.phase === 'resolving') {
      const timer = setTimeout(() => dispatch({ type: 'OPPONENT_TURN_RESOLVE' }), 2000);
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
  }, [state.phase, state.playerStunned]);

  const isPlayerTurn = state.phase === 'player_turn';
  const playerHpPct = (state.player.hp / state.player.maxHp) * 100;
  const playerMpPct = (state.player.mp / state.player.maxMp) * 100;
  const opponentHpPct = (state.opponent.hp / state.opponent.def.maxHp) * 100;

  return {
    state,
    dispatch: dispatch as Dispatch<BattleAction>,
    isPlayerTurn,
    playerHpPct,
    playerMpPct,
    opponentHpPct,
  };
}
