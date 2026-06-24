import { getTransitionColorHex } from '../../utils/color';

interface ProgressBarProps {
  phase: 'playing' | 'won' | 'lost';
  description: string;
  fillPct: number;
}

export function MiniGameProgressBar({ phase, description, fillPct }: ProgressBarProps) {
  const statusLabel = phase === 'lost'
    ? '💔'
    : (description ?? 'next');

  return (
    <div className="absolute right-3 inset-y-0 flex flex-col items-center py-2 gap-1 pointer-events-none">
      {/* Label at top */}
      <div
        className={`font-pixel text-2xl mb-1 pointer-events-none ${
          phase === 'won' ? 'text-pulse' : 'text-text-muted'
        }`}
      >
        {statusLabel}
      </div>

      {/* Bar track */}
      <div className="flex-1 w-3 bg-theme-surface rounded-full overflow-hidden border border-border-subtle flex flex-col-reverse">
        <div
          className="rounded-full transition-all duration-150"
          style={{
            height: `${fillPct}%`,
            backgroundColor: getTransitionColorHex('#fff', '#c0406a', fillPct / 100),
          }}
        />
      </div>
    </div>
  );
}
