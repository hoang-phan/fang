import type { GameState, OpponentDef, EquipmentItem } from '../types';

const SAVE_KEY = 'fang_game_v1';
const OPPONENTS_CACHE_KEY = 'fang_opponents_cache_v2';
const ITEMS_CACHE_KEY = 'fang_items_cache_v1';

export function hasSaveData(): boolean {
  try {
    return localStorage.getItem(SAVE_KEY) !== null;
  } catch {
    return false;
  }
}

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

export function saveOpponentsCache(opponents: OpponentDef[]): void {
  try {
    localStorage.setItem(OPPONENTS_CACHE_KEY, JSON.stringify(opponents));
  } catch {
    // storage full or unavailable
  }
}

export function loadOpponentsCache(): OpponentDef[] | null {
  try {
    const raw = localStorage.getItem(OPPONENTS_CACHE_KEY);
    return raw ? (JSON.parse(raw) as OpponentDef[]) : null;
  } catch {
    return null;
  }
}

export function saveItemsCache(items: EquipmentItem[]): void {
  try {
    localStorage.setItem(ITEMS_CACHE_KEY, JSON.stringify(items));
  } catch {
    // storage full or unavailable
  }
}

export function loadItemsCache(): EquipmentItem[] | null {
  try {
    const raw = localStorage.getItem(ITEMS_CACHE_KEY);
    return raw ? (JSON.parse(raw) as EquipmentItem[]) : null;
  } catch {
    return null;
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
