import { getContrastColor } from '../../utils/color';

export type DialogueMode = 'dialogue' | 'cinematic';

export interface DialogueBottomProps {
  mode: DialogueMode;
  content: string;
  advance: () => void;
  advanceLabel: string;
  speaker: string | null;
  isHero: boolean;
  isConversationVideo: boolean | undefined;
  backgroundColor: string;
  heroName: string;
}

export function DialogueBottom({
  mode,
  content,
  advance,
  advanceLabel,
  speaker,
  isHero,
  isConversationVideo,
  backgroundColor,
  heroName,
}: DialogueBottomProps) {
  if (mode === 'dialogue') {
    return (
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
              {content.replaceAll('{{PLAYER}}', heroName)}
            </p>
            <div className="flex justify-end">
              <button onClick={advance} className="text-xs text-text-faint hover:text-text-muted transition-colors">
                {advanceLabel}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // cinematic mode — dialog box hidden, just the continue/close button
  return (
    <div className="absolute bottom-5 right-5 flex justify-end mx-auto w-full">
      <button
        onClick={advance}
        className="text-2xl transition-colors"
        style={{ color: getContrastColor(backgroundColor) }}
      >
        {advanceLabel}
      </button>
    </div>
  );
}
