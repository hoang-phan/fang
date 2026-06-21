import type { Conversation } from '../../types';
import { useConversationAdvance } from './useConversationAdvance';

export const API_BASE = 'http://localhost:3000';

interface ConversationOverlayProps {
  conversations: Conversation[];
  opponentAvatarUrl?: string;
  opponentSprite?: string;
  opponentName: string;
  onComplete: () => void;
}

export function ConversationOverlay({
  conversations,
  opponentAvatarUrl,
  opponentSprite,
  opponentName,
  onComplete,
}: ConversationOverlayProps) {
  const { currentConv, current, isVeryLast, advance } = useConversationAdvance(conversations, onComplete);

  if (conversations.length === 0) {
    onComplete();
    return null;
  }

  const isHero = current.avatar === 'hero';
  const speakerName = isHero ? 'You' : opponentName;

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col cursor-pointer select-none bg-theme-conversation"
      onClick={advance}
    >
      {currentConv.backgroundUrl && (
        <img
          src={currentConv.backgroundUrl}
          alt="background"
          className="absolute inset-0 w-full h-[calc(100%-150px)] object-contain"
          style={{ maskImage: 'radial-gradient(circle, black 20px, transparent 100%)' }}
        />
      )}

      <div className="relative flex-1" />

      <div className="relative shrink-0 pb-1 px-4 flex flex-col items-start mx-auto w-full">
        {current.avatar && !isHero ? (
          <img
            src={`${API_BASE}/${current.avatar}`}
            alt={opponentName}
            className="absolute bottom-[150px] left-0 max-h-[600px] object-contain"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className="text-4xl">{opponentSprite ?? '❓'}</span>
          </div>
        )}

        <div
          className="w-full rounded-xl rounded-tl-none border border-border-mid bg-theme-dialogue p-5 shadow-lg"
          style={{ minHeight: '140px' }}
          onClick={e => { e.stopPropagation(); advance(); }}
        >
          <div className="flex flex-col gap-3 h-full">
            <div className="font-bold text-sm" style={{ color: isHero ? 'var(--player-border)' : 'var(--accent)' }}>
              {speakerName}
            </div>
            <p className="text-text-faint text-sm leading-relaxed flex-1">{current.content}</p>
            <div className="flex justify-end">
              <button onClick={e => { e.stopPropagation(); advance(); }} className="text-xs text-text-faint hover:text-text-muted transition-colors">
                {isVeryLast ? 'Close ▼' : 'Continue ▼'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
