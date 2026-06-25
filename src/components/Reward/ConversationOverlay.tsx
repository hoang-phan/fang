import { useCallback, useEffect, useRef } from 'react';
import type { Conversation } from '../../types';
import { Sprite } from './Sprite';
import { useConversationAdvance } from './useConversationAdvance';
import { getContrastColor } from '../../utils/color';
import { ClickMiniGame } from './ClickMiniGame';
import { WordsCatcherGame } from './WordsCatcherGame';
import { ShufflePuzzleGame } from './ShufflePuzzleGame';
import { useConversationKeys } from '../../hooks/useKeyboardShortcuts';

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
  const minigameClickRef = useRef<(() => void) | null>(null);
  const catcherMoveLeftRef = useRef<(() => void) | null>(null);
  const catcherMoveRightRef = useRef<(() => void) | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const advanceRef = useRef(advance);
  const isMiniGameRef = useRef(false);
  const isWordsCatcherRef = useRef(false);

  useEffect(() => {
    advanceRef.current = advance;
    isMiniGameRef.current = !!(current && current.content.startsWith('(click-game'));
    isWordsCatcherRef.current = !!(current && current.content.startsWith('(words-catcher'));
  });

  const isShufflePuzzle = !!(current && current.content.startsWith('(shuffle-puzzle'));

  useConversationKeys({ advanceRef, isMiniGameRef, miniGameClickRef: minigameClickRef, isWordsCatcherRef, catcherMoveLeftRef, catcherMoveRightRef });

  const isConversationVideo = currentConv?.backgroundUrl?.endsWith('.mp4');
  const fileParts = currentConv?.backgroundUrl?.split('/');
  const isEBackground = fileParts ? fileParts[fileParts.length - 1].startsWith('e') : false;

  useEffect(() => {
    if (bgFading && isConversationVideo && videoRef.current) {
      videoRef.current.style.transition = 'opacity 0.5s';
      videoRef.current.style.opacity = '0';
      const el = videoRef.current;
      const handler = () => onBgFadeOutEnd();
      el.addEventListener('transitionend', handler, { once: true });
      return () => el.removeEventListener('transitionend', handler);
    }
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
  const isMinigame = current.content.startsWith('(click-game');
  const isWordsCatcher = current.content.startsWith('(words-catcher');
  const isAnyMinigame = isMinigame || isWordsCatcher || isShufflePuzzle;
  const isDialogueMode = !isAnyMinigame && current.content !== '(...)';
  const advanceLabel = isVeryLast ? 'Close ▼' : 'Continue ▼';
  const speaker = speakerLabel(current.role, opponentName, heroName);

  const handleOuterClick = isMinigame
    ? () => minigameClickRef.current?.()
    : isWordsCatcher || isShufflePuzzle
    ? undefined
    : advance;

  const isConversationImage = currentConv.backgroundUrl && !isConversationVideo;

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col select-none transition-colors duration-500"
      style={{ backgroundColor: currentConv.backgroundColor ?? '#1a232c', cursor: 'pointer' }}
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

      {(isDialogueMode || isMinigame) && (
        <div className="relative flex-1 overflow-hidden">
          {current.sprites.map((sprite, i) => <Sprite key={i} sprite={sprite} />)}
        </div>
      )}

      {isWordsCatcher && (
        <WordsCatcherGame
          description={current.content.match(/\(words-catcher:([^)]*)\)/)?.[1] ?? ''}
          onWin={advance}
          onLose={onFail ?? advance}
          onMoveLeft={fn => { catcherMoveLeftRef.current = fn; }}
          onMoveRight={fn => { catcherMoveRightRef.current = fn; }}
          onLevelChange={handleFillChange}
        />
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

      {isMinigame ? (
        <ClickMiniGame
          description={current.content.match(/\(click-game:([^)]*)\)/)?.[1] ?? ''}
          onWin={advance}
          onLose={onFail ?? advance}
          registerClick={fn => { minigameClickRef.current = fn; }}
          onFillChange={handleFillChange}
        />
      ) : isWordsCatcher ? null : isDialogueMode ? (
        <div className="relative shrink-0 pb-1 px-4 flex flex-col items-start mx-auto w-full">
          <div
            className="w-full rounded-xl rounded-tl-none border border-border-mid p-5 shadow-lg"
            style={{ minHeight: '140px', backgroundColor: isConversationVideo ? '#FDC9D411' : '#FDC9D4' }}
          >
            <div className="flex flex-col gap-3 h-full">
              {speaker && (
                <div className="font-bold text-sm" style={{ color: isHero ? 'var(--player-border)' : 'var(--accent)' }}>
                  {speaker}
                </div>
              )}
              <p
                className="text-text-bright text-xl font-bold leading-relaxed flex-1"
                style={{
                  color: isConversationVideo ? '#ffe0ee' : '#7a4060',
                  textShadow: isConversationVideo ? '-1px 0 black, 0 1px black, 1px 0 black, 0 -1px black' : null
                }}
              >
                {current.content.replaceAll('{{PLAYER}}', heroName)}</p>
              <div className="flex justify-end">
                <button onClick={advance} className="text-xs text-text-faint hover:text-text-muted transition-colors">
                  {advanceLabel}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="absolute bottom-5 right-5 flex justify-end mx-auto w-full">
          <button
            onClick={advance}
            className="text-2xl transition-colors"
            style={{ color: getContrastColor(currentConv.backgroundColor ?? '#1a232c') }}
          >
            {advanceLabel}
          </button>
        </div>
      )}
    </div>
  );
}
