interface ProgressBarProps {
  label: string;
  value: number;
  max: number;
  color?: string;
  autoColor?: boolean;
}

function hpColor(pct: number): string {
  if (pct > 50) return 'bg-green-500';
  if (pct > 20) return 'bg-accent-muted';
  return 'bg-red-500';
}

export function ProgressBar({ label, value, max, color, autoColor }: ProgressBarProps) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  const barColor = autoColor ? hpColor(pct) : (color ?? 'bg-bar-mp');

  return (
    <div className="w-full">
      <div className="flex justify-between text-xs mb-1 font-mono">
        <span className="text-text-muted">{label}</span>
        <span className="text-text-normal">{Math.max(0, value)}/{max}</span>
      </div>
      <div className="w-full bg-theme-raised rounded-full h-3 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-300 ${barColor}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
