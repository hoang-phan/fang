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
  side: 'player' | 'opponent';
}

export function CombatantCard({ name, sprite, avatarUrl, hp, maxHp, mp, maxMp, isFlashing, side }: CombatantCardProps) {
  const bg = side === 'player' ? 'bg-player-bg border-player-border' : 'bg-enemy-bg border-enemy-border';

  return (
    <div className={`rounded-xl border p-4 flex flex-col gap-3 ${bg} ${isFlashing ? 'damage-flash' : ''}`}>
      <div className="flex items-center gap-3">
        {avatarUrl
          ? <img src={avatarUrl} alt={name} className="w-24 h-24 object-contain" />
          : <span className="text-4xl">{sprite}</span>
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
