import type { Move, ElementType, PlayerStatBonuses } from '../../types';

const TYPE_ICONS: Record<ElementType, string> = {
  normal:   '⚪',
  fire:     '🔥',
  water:    '💧',
  electric: '⚡',
  grass:    '🌿',
  ice:      '❄️',
  poison:   '☠️',
  earth:    '🪨',
  dark:     '🌑',
  psychic:  '🔮',
};

interface MoveButtonProps {
  move: Move | null;
  playerMp: number;
  playerStats?: PlayerStatBonuses;
  opponentType?: ElementType;
  disabled?: boolean;
  onClick: () => void;
}

export function MoveButton({ move, playerMp, disabled, onClick }: MoveButtonProps) {
  const noMp = move ? playerMp < move.mpCost : false;
  const isDisabled = disabled || !move || noMp;

  if (!move) {
    return (
      <button
        disabled
        className="flex-1 min-w-0 rounded-lg border border-border-mid bg-theme-surface/50 p-3 text-left opacity-30 cursor-not-allowed"
      >
        <div className="text-text-faint text-xs">— Empty —</div>
      </button>
    );
  }

  return (
    <button
      onClick={onClick}
      disabled={isDisabled}
      title={move.description}
      className={`
        flex-1 min-w-0 rounded-lg border p-3 text-left transition-all duration-150
        ${isDisabled
          ? 'border-border-mid bg-theme-surface/50 opacity-40 cursor-not-allowed'
          : 'border-purple-700 bg-purple-900/40 hover:bg-purple-800/60 cursor-pointer'
        }
      `}
    >
      <div className="flex items-center gap-2 mb-1">
        <span className="text-lg">{TYPE_ICONS[move.type]}</span>
        <span className="text-xs font-bold text-text-bright truncate">{move.name}</span>
        {move.level > 1 && (
          <span className="text-xs text-accent-muted ml-auto">Lv{move.level}</span>
        )}
      </div>
      <div className="flex items-center gap-2">
        <span className={`text-xs ${noMp ? 'text-red-400' : 'text-blue-400'}`}>
          {move.mpCost} MP
        </span>
      </div>
    </button>
  );
}
