import { useCallback, useRef } from 'react';
import type { Conversation } from '../../types';
import { useConversationAdvance } from '../../hooks/useConversationAdvance';
import { useConversationKeys } from '../../hooks/useKeyboardShortcuts';
import { detectMode } from '../MiniGame/miniGameMode';
import { Background, type BackgroundHandle } from './Background';
import { Sprites } from './Sprites';
import { MiniGameCenter } from '../MiniGame/MiniGameCenter';
import { DialogueBottom } from './DialogueBottom';

interface ConversationOverlayProps {
  conversations: Conversation[];
  opponentName: string;
  heroName?: string;
  onComplete: () => void;
  onFail?: () => void;
}

function speakerLabel(role: string, opponentName: string, heroName: string): string | null {
  if (role === 'hero') return heroName;
  if (role === 'opponent') return opponentName;
  return null;
}

export function ConversationOverlay({
  conversations,
  opponentName,
  heroName = 'You',
  onComplete,
  onFail,
}: ConversationOverlayProps) {
  const { currentConv, current, isVeryLast, advance, bgFading, onBgFadeOutEnd } = useConversationAdvance(conversations, onComplete);
  const lastAdvanceTimeRef = useRef(0);
  const backgroundRef = useRef<BackgroundHandle>(null);

  const guardedAdvance = useCallback(() => {
    const now = Date.now();
    if (now - lastAdvanceTimeRef.current < 200) return;
    lastAdvanceTimeRef.current = now;
    advance();
  }, [advance]);

  const currentContent = current?.content ?? '';
  const miniGameMode = detectMode(currentContent);
  const isAnyMinigame = miniGameMode !== null;

  useConversationKeys({
    advance: isAnyMinigame ? () => {} : guardedAdvance,
    isMiniGame: false,
    miniGameClickRef: { current: null },
    isWordsCatcher: false,
    catcherMoveLeftRef: { current: null },
    catcherMoveRightRef: { current: null },
    isMultiChoice: false,
    multiChoiceSelectRef: { current: null },
  });

  if (conversations.length === 0 || !current) {
    onComplete();
    return null;
  }

  const isDialogueMode = !isAnyMinigame && current.content !== '(...)';
  const advanceLabel = isVeryLast ? 'Close ▼' : 'Continue ▼';
  const speaker = speakerLabel(current.role, opponentName, heroName);
  const backgroundColor = currentConv.backgroundColor ?? '#1a232c';
  const spriteImageUrl = current.sprites[0]?.url ?? '';
  const showSprites = isDialogueMode || miniGameMode === 'click' || miniGameMode === 'multichoice';

  const handleOuterClick = isAnyMinigame ? undefined : guardedAdvance;

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col select-none transition-colors duration-500"
      style={{ backgroundColor, cursor: 'pointer' }}
      onClick={handleOuterClick}
    >
      <Background
        ref={backgroundRef}
        backgroundUrl={currentConv?.backgroundUrl}
        backgroundColor={backgroundColor}
        bgFading={bgFading}
        onBgFadeOutEnd={onBgFadeOutEnd}
        videoControlledExternally={isAnyMinigame}
      />

      {showSprites && (
        <Sprites sprites={current.sprites} fading={bgFading} />
      )}

      {isAnyMinigame && (
        <MiniGameCenter
          content={currentContent}
          spriteImageUrl={spriteImageUrl}
          onComplete={guardedAdvance}
          onFail={onFail}
          onFillChange={fill => backgroundRef.current?.setFill(fill)}
        />
      )}

      {!isAnyMinigame && (
        <DialogueBottom
          mode={isDialogueMode ? 'dialogue' : 'cinematic'}
          content={currentContent}
          advance={guardedAdvance}
          advanceLabel={advanceLabel}
          speaker={speaker}
          isHero={current.role === 'hero'}
          isConversationVideo={currentConv?.backgroundUrl?.endsWith('.mp4')}
          backgroundColor={backgroundColor}
          heroName={heroName}
        />
      )}
    </div>
  );
}
