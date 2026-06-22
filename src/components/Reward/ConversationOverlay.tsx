import { useCallback, useRef } from 'react';
import type { Conversation } from '../../types';
import { Sprite } from './Sprite';
import { useConversationAdvance } from './useConversationAdvance';
import { getContrastColor } from '../../utils/color';
import { ClickMiniGame } from './ClickMiniGame';

interface ConversationOverlayProps {
  conversations: Conversation[];
  opponentName: string;
  heroName?: string;
  onComplete: () => void;
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
}: ConversationOverlayProps) {
  const { currentConv, current, isVeryLast, advance, bgFading, onBgFadeOutEnd } = useConversationAdvance(conversations, onComplete);
  const minigameClickRef = useRef<(() => void) | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const handleFillChange = useCallback((fill: number) => {
    if (videoRef.current) {
      videoRef.current.playbackRate = 0.1 + fill * 1.4;
    }
  }, []);

  if (conversations.length === 0 || !current) {
    onComplete();
    return null;
  }

  const isHero = current.role === 'hero';
  const isMinigame = current.content.startsWith('(click-game');
  const isDialogueMode = !isMinigame && current.content !== '(...)';
  const advanceLabel = isVeryLast ? 'Close ▼' : 'Continue ▼';
  const speaker = speakerLabel(current.role, opponentName, heroName);

  const handleOuterClick = isMinigame
    ? () => minigameClickRef.current?.()
    : advance;

  const isConversationVideo = currentConv.backgroundUrl?.endsWith('.mp4');
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
          className="absolute inset-0 w-full h-full object-contain transition-opacity duration-500"
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
          style={{ opacity: bgFading ? 0 : 1 }}
          onTransitionEnd={bgFading ? onBgFadeOutEnd : undefined}
        />
      )}

      {(isDialogueMode || isMinigame) && (
        <div className="relative flex-1 overflow-hidden">
          {current.sprites.map((sprite, i) => <Sprite key={i} sprite={sprite} />)}
        </div>
      )}

      {isMinigame ? (
        <ClickMiniGame
          description={current.content.match(/\(click-game:([^)]*)\)/)?.[1] ?? ''}
          onWin={advance}
          onLose={advance}
          registerClick={fn => { minigameClickRef.current = fn; }}
          onFillChange={handleFillChange}
        />
      ) : isDialogueMode ? (
        <div className="relative shrink-0 pb-1 px-4 flex flex-col items-start mx-auto w-full">
          <div
            className="w-full rounded-xl rounded-tl-none border border-border-mid bg-theme-dialogue p-5 shadow-lg"
            style={{ minHeight: '140px' }}
          >
            <div className="flex flex-col gap-3 h-full">
              {speaker && (
                <div className="font-bold text-sm" style={{ color: isHero ? 'var(--player-border)' : 'var(--accent)' }}>
                  {speaker}
                </div>
              )}
              <p className="text-text-faint text-sm leading-relaxed flex-1">{current.content.replaceAll('{{PLAYER}}', heroName)}</p>
              <div className="flex justify-end">
                <button onClick={advance} className="text-xs text-text-faint hover:text-text-muted transition-colors">
                  {advanceLabel}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="relative shrink-0 pb-4 px-4 flex justify-end mx-auto w-full">
          <button
            onClick={advance}
            className="text-xs transition-colors"
            style={{ color: getContrastColor(currentConv.backgroundColor ?? '#1a232c') }}
          >
            {advanceLabel}
          </button>
        </div>
      )}
    </div>
  );
}
