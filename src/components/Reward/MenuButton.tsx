interface MenuButtonProps {
  icon: string;
  label: string;
  description: string;
  disabled?: boolean;
  disabledReason?: string;
  focused?: boolean;
  onClick: () => void;
  accent?: 'gold' | 'pink';
}

export function MenuButton({ icon, label, description, disabled, disabledReason, focused, onClick, accent }: MenuButtonProps) {
  const accentClass = accent === 'gold'
    ? 'border-yellow-600 bg-yellow-900/20 hover:bg-yellow-900/40'
    : accent === 'pink'
    ? 'border-pink-600 bg-pink-900/20 hover:bg-pink-900/40'
    : 'border-border-strong bg-theme-surface/60 hover:border-text-faint hover:bg-theme-surface';

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`
        w-full text-left rounded-xl border p-4 transition-all duration-150 flex items-center gap-4
        ${disabled ? 'opacity-40 cursor-not-allowed border-border-mid bg-theme-surface/30' : `cursor-pointer ${accentClass}`}
        ${focused && !disabled ? 'ring-2 ring-white/60 ring-offset-1 ring-offset-transparent' : ''}
      `}
    >
      <span className="text-3xl shrink-0">{icon}</span>
      <div className="flex-1 min-w-0">
        <div className="font-bold text-text-bright text-sm">{label}</div>
        <div className="text-xs text-text-muted mt-0.5">
          {disabled && disabledReason ? disabledReason : description}
        </div>
      </div>
      {!disabled && <span className={`text-lg shrink-0 ${focused ? 'text-white' : 'text-text-muted'}`}>▶</span>}
    </button>
  );
}
