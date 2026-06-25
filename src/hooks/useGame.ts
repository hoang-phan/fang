import { useReducer, useEffect, type Dispatch } from 'react';
import type { GameState } from '../types';
import { gameReducer, type GameAction, DEFAULT_GAME_STATE } from '../reducers/gameReducer';
import { saveGameState, loadGameState, hasSaveData } from '../utils/storage';

function init(): GameState {
  const loaded = loadGameState(DEFAULT_GAME_STATE);
  // Show start screen if save data exists (screen is always reset to opponent_select by loadGameState)
  if (hasSaveData()) {
    return { ...loaded, screen: 'start' };
  }
  return loaded;
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
