import { ProgressBar } from '../ui/ProgressBar';

interface CombatantCardProps {
  name: string;
  sprite: string;
  avatarUrl?: string;
  hp: number;
  maxHp: number;
  mp?: number;
  maxMp?: number;
  isFlashing?: boolean;
  flashColor?: string;
  side: 'player' | 'opponent';
}

export function CombatantCard({ name, sprite, avatarUrl, hp, maxHp, mp, maxMp, isFlashing, flashColor, side }: CombatantCardProps) {
  const bg = side === 'player' ? 'bg-player-bg border-player-border' : 'bg-enemy-bg border-enemy-border';
  const flashClass = isFlashing ? (flashColor ? 'element-flash' : 'damage-flash') : '';

  return (
    <div
      className={`w-full rounded-xl border p-2 lg:p-4 flex flex-col gap-2 lg:gap-3 ${bg} ${flashClass}`}
      style={flashColor ? { '--flash-color': flashColor } as React.CSSProperties : undefined}
    >
      <div className="flex items-center gap-2 lg:gap-3">
        {avatarUrl
          ? <img src={avatarUrl} alt={name} className="w-14 h-14 lg:w-24 lg:h-24 object-contain shrink-0" />
          : <span className="text-2xl lg:text-4xl shrink-0">{sprite}</span>
        }
        <div className="flex-1">
          <p className="font-pixel text-xs text-text-bright mb-2">{name}</p>
          <ProgressBar label="HP" value={hp} max={maxHp} autoColor />
          {mp != null && maxMp != null && (
            <div className="mt-2">
              <ProgressBar label="MP" value={mp} max={maxMp} color="bg-bar-mp" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
