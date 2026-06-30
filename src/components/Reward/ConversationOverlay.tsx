import { useCallback, useEffect, useRef, useState } from 'react';
import type { Conversation } from '../../types';
import { Sprite } from './Sprite';
import { useConversationAdvance } from '../../hooks/useConversationAdvance';
import { ShufflePuzzleGame } from './ShufflePuzzleGame';
import { useConversationKeys } from '../../hooks/useKeyboardShortcuts';
import { DialogueBottom } from './DialogueBottom';
import type { DialogueBottomProps } from './DialogueBottom';

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
  const [spriteFading, setSpriteFading] = useState(false);
  const [visibleSprites, setVisibleSprites] = useState(() => current?.sprites ?? []);
  const prevSpriteKey = useRef<string>('');
  const spriteFadingRef = useRef(false);
  const lastAdvanceTimeRef = useRef(0);
  const minigameClickRef = useRef<(() => void) | null>(null);
  const catcherMoveLeftRef = useRef<(() => void) | null>(null);
  const catcherMoveRightRef = useRef<(() => void) | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const multiChoiceSelectRef = useRef<((index: number) => void) | null>(null);

  // Keep spriteFadingRef in sync so guardedAdvance can read it without stale closure.
  useEffect(() => { spriteFadingRef.current = spriteFading; }, [spriteFading]);

  // Throttled advance: ignore calls within 200ms of the last one, and block while sprites are fading.
  const guardedAdvance = useCallback(() => {
    if (spriteFadingRef.current) return;
    const now = Date.now();
    if (now - lastAdvanceTimeRef.current < 200) return;
    lastAdvanceTimeRef.current = now;
    advance();
  }, [advance]);

  const isShufflePuzzle = !!(current && current.content.startsWith('(shuffle-puzzle'));
  const currentContent = current?.content ?? '';
  const isMultiChoice = currentContent.startsWith('(multichoice:');
  const isMiniGame = !!(current && current.content.startsWith('(click-game'));
  const isWordsCatcher = !!(current && current.content.startsWith('(words-catcher'));

  useConversationKeys({
    advance: guardedAdvance,
    isMiniGame,
    miniGameClickRef: minigameClickRef,
    isWordsCatcher,
    catcherMoveLeftRef,
    catcherMoveRightRef,
    isMultiChoice,
    multiChoiceSelectRef,
  });

  // Fade sprites out when they change between chats, then swap and fade back in.
  useEffect(() => {
    const newKey = (current?.sprites ?? []).map(s => s.url).join('|');
    if (newKey === prevSpriteKey.current) return;
    if (!prevSpriteKey.current) {
      // First render — just record the key, no fade needed.
      prevSpriteKey.current = newKey;
      setVisibleSprites(current?.sprites ?? []);
      return;
    }
    prevSpriteKey.current = newKey;
    setSpriteFading(true);
    const t = setTimeout(() => {
      setVisibleSprites(current?.sprites ?? []);
      setSpriteFading(false);
    }, 300);
    return () => clearTimeout(t);
  }, [current]);

  const isConversationVideo = currentConv?.backgroundUrl?.endsWith('.mp4');
  const isConversationImage = !!(currentConv?.backgroundUrl && !isConversationVideo);
  const fileParts = currentConv?.backgroundUrl?.split('/');
  const isEBackground = fileParts ? fileParts[fileParts.length - 1].startsWith('e') : false;

  useEffect(() => {
    if (!bgFading) return;
    if (isConversationVideo && videoRef.current) {
      const el = videoRef.current;
      el.style.transition = 'opacity 0.5s';
      el.style.opacity = '0';
      const handler = () => onBgFadeOutEnd();
      el.addEventListener('transitionend', handler, { once: true });
      // Fallback in case transitionend never fires (e.g. element remounted with opacity already 0).
      const fallback = setTimeout(onBgFadeOutEnd, 550);
      return () => { el.removeEventListener('transitionend', handler); clearTimeout(fallback); };
    }
    // For image backgrounds the transitionend is on the <img> element via onTransitionEnd prop.
    // Add a timeout fallback in case the transition never fires (freshly mounted img, no prior opacity to transition from).
    const fallback = setTimeout(onBgFadeOutEnd, 550);
    return () => clearTimeout(fallback);
  }, [bgFading, isConversationVideo, onBgFadeOutEnd]);


  const handleFillChange = useCallback((fill: number) => {
    if (videoRef.current) {
      const rate = Math.max(0, -0.1 + fill * fill * fill * 1.2);
      videoRef.current.playbackRate = rate < 0.25 ? 0 : rate;
      videoRef.current.style.opacity = String(rate);
    }
  }, []);

  if (conversations.length === 0 || !current) {
    onComplete();
    return null;
  }

  const isHero = current.role === 'hero';
  const isAnyMinigame = isMiniGame || isWordsCatcher || isShufflePuzzle;
  const isDialogueMode = !isAnyMinigame && !isMultiChoice && current.content !== '(...)';
  const advanceLabel = isVeryLast ? 'Close ▼' : 'Continue ▼';
  const speaker = speakerLabel(current.role, opponentName, heroName);
  const backgroundColor = currentConv.backgroundColor ?? '#1a232c';

  const currentMode: DialogueBottomProps['mode'] =
    isMiniGame ? 'minigame' :
    isWordsCatcher ? 'words-catcher' :
    isMultiChoice ? 'multichoice' :
    isDialogueMode ? 'dialogue' :
    'cinematic';

  const handleOuterClick = isMiniGame
    ? () => minigameClickRef.current?.()
    : isWordsCatcher || isShufflePuzzle || isMultiChoice
    ? undefined
    : guardedAdvance;

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col select-none transition-colors duration-500"
      style={{ backgroundColor, cursor: 'pointer' }}
      onClick={handleOuterClick}
    >
      {isConversationImage && (
        <img
          src={currentConv.backgroundUrl}
          alt="background"
          className={`absolute inset-0 w-full h-full transition-opacity duration-500 ${isEBackground ? 'object-contain' : 'object-cover'}`}
          style={{ opacity: bgFading ? 0 : 1 }}
          onTransitionEnd={bgFading ? onBgFadeOutEnd : undefined}
        />
      )}

      {isConversationVideo && (
        <video
          ref={videoRef}
          src={currentConv.backgroundUrl}
          autoPlay
          muted
          loop
          className="absolute inset-0 w-full h-full object-contain transition-opacity duration-500"
          style={{ opacity: isAnyMinigame ? 0 : 1 }}
          onLoadedMetadata={() => {
            if (videoRef.current && isAnyMinigame) {
              videoRef.current.playbackRate = 0;
              videoRef.current.style.opacity = '0';
            } else if (videoRef.current) {
              videoRef.current.style.opacity = '1';
            }
          }}
        />
      )}

      {(isDialogueMode || isMiniGame || isMultiChoice) && (
        <div
          className="relative flex-1 overflow-hidden transition-opacity duration-300"
          style={{ opacity: bgFading || spriteFading ? 0 : 1 }}
        >
          {visibleSprites.map((sprite, i) => <Sprite key={i} sprite={sprite} />)}
        </div>
      )}

      {isShufflePuzzle && (
        <ShufflePuzzleGame
          description={current.content.match(/\(shuffle-puzzle:([^)]*)\)/)?.[1] ?? 'puzzle'}
          imageUrl={current.sprites[0]?.url ?? ''}
          onWin={advance}
          onLose={onFail ?? advance}
          onProgressChange={handleFillChange}
        />
      )}

      <DialogueBottom
        mode={currentMode}
        current={current}
        currentContent={currentContent}
        advance={guardedAdvance}
        advanceLabel={advanceLabel}
        speaker={speaker}
        isHero={isHero}
        isConversationVideo={isConversationVideo}
        backgroundColor={backgroundColor}
        onFail={onFail}
        handleFillChange={handleFillChange}
        minigameClickRef={minigameClickRef}
        catcherMoveLeftRef={catcherMoveLeftRef}
        catcherMoveRightRef={catcherMoveRightRef}
        multiChoiceSelectRef={multiChoiceSelectRef}
        heroName={heroName}
      />
    </div>
  );
}
