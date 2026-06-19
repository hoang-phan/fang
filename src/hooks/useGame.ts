import { useReducer, useEffect, type Dispatch } from 'react';
import type { GameState } from '../types';
import { gameReducer, type GameAction, DEFAULT_GAME_STATE } from '../reducers/gameReducer';
import { saveGameState, loadGameState } from '../utils/storage';

function init(): GameState {
  return loadGameState(DEFAULT_GAME_STATE);
}

export function useGame() {
  const [state, dispatch] = useReducer(gameReducer, undefined, init);

  useEffect(() => {
    saveGameState(state);
  }, [state]);

  return {
    state,
    dispatch: dispatch as Dispatch<GameAction>,
  };
}
