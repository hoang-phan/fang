/**
 * MiniGameCenter — parent component for all mini-game modes.
 * Owns refs, keyboard wiring, and mode detection.
 * To add a new game: parse its content prefix into a mode below, then add a branch in the render.
 */
import { useRef } from 'react';
import { useConversationKeys } from '../../hooks/useKeyboardShortcuts';
import { ClickMiniGame } from './ClickMiniGame';
import { WordsCatcherGame } from './WordsCatcherGame';
import { ShufflePuzzleGame } from './ShufflePuzzleGame';
import { MultiChoicePrompt } from './MultiChoicePrompt';
import { detectMode } from './miniGameMode';
export type { MiniGameMode } from './miniGameMode';

export interface MiniGameCenterProps {
  content: string;
  spriteImageUrl: string;
  onComplete: () => void;
  onFail?: () => void;
  onFillChange?: (fill: number) => void;
}


export function MiniGameCenter({ content, spriteImageUrl, onComplete, onFail, onFillChange }: MiniGameCenterProps) {
  const minigameClickRef = useRef<(() => void) | null>(null);
  const catcherMoveLeftRef = useRef<(() => void) | null>(null);
  const catcherMoveRightRef = useRef<(() => void) | null>(null);
  const multiChoiceSelectRef = useRef<((index: number) => void) | null>(null);

  const mode = detectMode(content);
  const isMiniGame = mode === 'click';
  const isWordsCatcher = mode === 'words-catcher';
  const isMultiChoice = mode === 'multichoice';

  useConversationKeys({
    advance: onComplete,
    isMiniGame,
    miniGameClickRef: minigameClickRef,
    isWordsCatcher,
    catcherMoveLeftRef,
    catcherMoveRightRef,
    isMultiChoice,
    multiChoiceSelectRef,
  });

  const onLose = onFail ?? onComplete;

  if (mode === 'click') {
    return (
      <ClickMiniGame
        description={content.match(/\(click-game:([^)]*)\)/)?.[1] ?? ''}
        onWin={onComplete}
        onLose={onLose}
        registerClick={fn => { minigameClickRef.current = fn; }}
        onFillChange={onFillChange}
      />
    );
  }

  if (mode === 'words-catcher') {
    return (
      <WordsCatcherGame
        description={content.match(/\(words-catcher:([^)]*)\)/)?.[1] ?? ''}
        onWin={onComplete}
        onLose={onLose}
        onMoveLeft={fn => { catcherMoveLeftRef.current = fn; }}
        onMoveRight={fn => { catcherMoveRightRef.current = fn; }}
        onLevelChange={onFillChange}
      />
    );
  }

  if (mode === 'shuffle-puzzle') {
    return (
      <ShufflePuzzleGame
        description={content.match(/\(shuffle-puzzle:([^)]*)\)/)?.[1] ?? 'puzzle'}
        imageUrl={spriteImageUrl}
        onWin={onComplete}
        onLose={onLose}
        onProgressChange={onFillChange}
      />
    );
  }

  if (mode === 'multichoice') {
    return (
      <MultiChoicePrompt
        key={content}
        content={content}
        onAdvance={onComplete}
        registerSelectByIndex={fn => { multiChoiceSelectRef.current = fn; }}
      />
    );
  }

  return null;
}
