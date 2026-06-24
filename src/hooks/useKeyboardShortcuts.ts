import { useEffect, useRef } from 'react';

const isDesktop = () => window.matchMedia('(hover: hover) and (pointer: fine)').matches;

// ── Opponent select screen ────────────────────────────────────────────────────
// ArrowUp / ArrowDown  navigate opponent list (wrapped)
// F                    start the fight

const KEYS_NAVIGATE_DOWN = ['ArrowDown'];
const KEYS_NAVIGATE_UP = ['ArrowUp'];
const KEYS_FIGHT = ['f', 'F'];

// ── Battle screen ─────────────────────────────────────────────────────────────
// A            basic attack
// 1–4          use special move slot

const KEYS_ATTACK = ['a', 'A'];

// ── Reward / Shop screen ──────────────────────────────────────────────────────
// ArrowUp / ArrowDown  navigate menu items
// Z                    select / confirm
// Escape               go back

const KEYS_SELECT = ['z', 'Z'];
const KEYS_BACK = ['Escape'];

// ── Conversation overlay ──────────────────────────────────────────────────────
// Z          advance chat
// F          trigger minigame click (same as tapping during a click-game)

const KEYS_ADVANCE = ['z', 'Z'];
const KEYS_CLICK_MINIGAME = ['f', 'F'];

interface OpponentSelectKeys {
  opponents: { id: string }[];
  selectedOpponentId: string | null;
  onNavigate: (id: string) => void;
  onFight: () => void;
}

export function useOpponentSelectKeys({ opponents, selectedOpponentId, onNavigate, onFight }: OpponentSelectKeys) {
  useEffect(() => {
    if (!isDesktop()) return;

    const handler = (e: KeyboardEvent) => {
      if (KEYS_FIGHT.includes(e.key)) {
        onFight();
        return;
      }
      if (KEYS_NAVIGATE_DOWN.includes(e.key) || KEYS_NAVIGATE_UP.includes(e.key)) {
        e.preventDefault();
        if (opponents.length === 0) return;
        const currentIndex = opponents.findIndex(o => o.id === selectedOpponentId);
        let nextIndex: number;
        if (currentIndex === -1) {
          nextIndex = KEYS_NAVIGATE_DOWN.includes(e.key) ? 0 : opponents.length - 1;
        } else if (KEYS_NAVIGATE_DOWN.includes(e.key)) {
          nextIndex = (currentIndex + 1) % opponents.length;
        } else {
          nextIndex = (currentIndex - 1 + opponents.length) % opponents.length;
        }
        onNavigate(opponents[nextIndex].id);
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [opponents, selectedOpponentId, onNavigate, onFight]);
}

interface ConversationKeys {
  advanceRef: React.RefObject<() => void>;
  isMiniGameRef: React.RefObject<boolean>;
  miniGameClickRef: React.RefObject<(() => void) | null>;
}

export function useConversationKeys({ advanceRef, isMiniGameRef, miniGameClickRef }: ConversationKeys) {
  useEffect(() => {
    if (!isDesktop()) return;

    const handler = (e: KeyboardEvent) => {
      if (KEYS_ADVANCE.includes(e.key)) {
        if (isMiniGameRef.current) {
          miniGameClickRef.current?.();
        } else {
          advanceRef.current?.();
        }
        return;
      }
      if (KEYS_CLICK_MINIGAME.includes(e.key) && isMiniGameRef.current) {
        miniGameClickRef.current?.();
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);
}

// ── Battle screen keys ────────────────────────────────────────────────────────

interface BattleKeys {
  isPlayerTurn: boolean;
  moves: (import('../types').Move | null)[];
  playerMp: number;
  onAttack: () => void;
  onSpecial: (slot: 0 | 1 | 2 | 3) => void;
}

export function useBattleKeys({ isPlayerTurn, moves, playerMp, onAttack, onSpecial }: BattleKeys) {
  const isPlayerTurnRef = useRef(isPlayerTurn);
  const movesRef = useRef(moves);
  const playerMpRef = useRef(playerMp);
  const onAttackRef = useRef(onAttack);
  const onSpecialRef = useRef(onSpecial);

  useEffect(() => { isPlayerTurnRef.current = isPlayerTurn; }, [isPlayerTurn]);
  useEffect(() => { movesRef.current = moves; }, [moves]);
  useEffect(() => { playerMpRef.current = playerMp; }, [playerMp]);
  useEffect(() => { onAttackRef.current = onAttack; }, [onAttack]);
  useEffect(() => { onSpecialRef.current = onSpecial; }, [onSpecial]);

  useEffect(() => {
    if (!isDesktop()) return;

    const handler = (e: KeyboardEvent) => {
      if (!isPlayerTurnRef.current) return;
      if (KEYS_ATTACK.includes(e.key)) {
        e.preventDefault();
        onAttackRef.current();
        return;
      }
      const slotMap: Record<string, 0 | 1 | 2 | 3> = { '1': 0, '2': 1, '3': 2, '4': 3 };
      const slot = slotMap[e.key];
      if (slot !== undefined) {
        e.preventDefault();
        const move = movesRef.current[slot];
        if (move && playerMpRef.current >= move.mpCost) {
          onSpecialRef.current(slot);
        }
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);
}

// ── Reward screen keys ────────────────────────────────────────────────────────

interface RewardMenuKeys {
  itemCount: number;
  focusedIndex: number;
  onNavigate: (index: number) => void;
  onSelect: () => void;
  onBack: (() => void) | null;
}

export function useRewardMenuKeys({ itemCount, focusedIndex, onNavigate, onSelect, onBack }: RewardMenuKeys) {
  const focusedIndexRef = useRef(focusedIndex);
  const itemCountRef = useRef(itemCount);
  const onNavigateRef = useRef(onNavigate);
  const onSelectRef = useRef(onSelect);
  const onBackRef = useRef(onBack);

  useEffect(() => { focusedIndexRef.current = focusedIndex; }, [focusedIndex]);
  useEffect(() => { itemCountRef.current = itemCount; }, [itemCount]);
  useEffect(() => { onNavigateRef.current = onNavigate; }, [onNavigate]);
  useEffect(() => { onSelectRef.current = onSelect; }, [onSelect]);
  useEffect(() => { onBackRef.current = onBack; }, [onBack]);

  useEffect(() => {
    if (!isDesktop()) return;

    const handler = (e: KeyboardEvent) => {
      if (KEYS_NAVIGATE_DOWN.includes(e.key) || KEYS_NAVIGATE_UP.includes(e.key)) {
        e.preventDefault();
        const count = itemCountRef.current;
        if (count === 0) return;
        const current = focusedIndexRef.current;
        const next = KEYS_NAVIGATE_DOWN.includes(e.key)
          ? (current + 1) % count
          : (current - 1 + count) % count;
        onNavigateRef.current(next);
        return;
      }
      if (KEYS_SELECT.includes(e.key)) {
        e.preventDefault();
        onSelectRef.current();
        return;
      }
      if (KEYS_BACK.includes(e.key) && onBackRef.current) {
        e.preventDefault();
        onBackRef.current();
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);
}

// ── Shop screen keys ──────────────────────────────────────────────────────────

interface ShopKeys {
  onContinue: () => void;
}

export function useShopKeys({ onContinue }: ShopKeys) {
  const onContinueRef = useRef(onContinue);
  useEffect(() => { onContinueRef.current = onContinue; }, [onContinue]);

  useEffect(() => {
    if (!isDesktop()) return;

    const handler = (e: KeyboardEvent) => {
      if (KEYS_SELECT.includes(e.key)) {
        e.preventDefault();
        onContinueRef.current();
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);
}
