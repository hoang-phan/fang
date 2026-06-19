import type { GameState } from '../types';

const SAVE_KEY = 'fang_game_v1';

export function saveGameState(state: GameState): void {
  const { activeBattle, ...rest } = state;
  void activeBattle;
  const toSave: Omit<GameState, 'activeBattle'> & { activeBattle: null } = {
    ...rest,
    screen: 'opponent_select',
    activeBattle: null,
  };
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(toSave));
  } catch {
    // storage full or unavailable — silently ignore
  }
}

export function loadGameState(defaultState: GameState): GameState {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return defaultState;
    const parsed = JSON.parse(raw) as GameState;
    return {
      ...defaultState,
      ...parsed,
      // Merge player so new fields added to DEFAULT_PLAYER are backfilled into old saves
      player: { ...defaultState.player, ...parsed.player },
      screen: 'opponent_select',
      activeBattle: null,
    };
  } catch {
    return defaultState;
  }
}
