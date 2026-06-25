import { ProgressBar } from '../ui/ProgressBar';

interface CombatantCardProps {
  name: string;
  sprite: string;
  avatarUrl?: string;
  hp: number;
  maxHp: number;
  mp?: number;
  maxMp?: number;
  damageFlashKey?: number | null;
  damageFlashColor?: string;
  hasShield?: boolean;
  shieldColor?: string;
  shieldFlashKey?: number | null;
  side: 'player' | 'opponent';
}

export function CombatantCard({ name, sprite, avatarUrl, hp, maxHp, mp, maxMp, damageFlashKey, damageFlashColor, hasShield, shieldColor, shieldFlashKey, side }: CombatantCardProps) {
  const bg = side === 'player' ? 'bg-player-bg border-player-border' : 'bg-enemy-bg border-enemy-border';
  const shieldStyle = shieldColor ? { '--shield-color': shieldColor } as React.CSSProperties : undefined;

  return (
    <div
      className={`relative w-full rounded-xl border p-2 lg:p-4 flex flex-col gap-2 lg:gap-3 ${bg} ${hasShield ? 'shield-active' : ''}`}
      style={shieldStyle}
    >
      {shieldFlashKey != null && (
        <div
          key={shieldFlashKey}
          className="shield-card-flash absolute inset-0 rounded-xl pointer-events-none z-10"
          style={{ backgroundColor: shieldColor ?? '#60a5fa' }}
        />
      )}
      <div className="flex items-center gap-2 lg:gap-3">
        {/* Avatar with damage flash overlay — key changes force animation replay */}
        <div key={damageFlashKey ?? 0} className="relative shrink-0">
          {avatarUrl
            ? <img src={avatarUrl} alt={name} className="w-14 h-14 lg:w-24 lg:h-24 object-contain" />
            : <span className="text-2xl lg:text-4xl">{sprite}</span>
          }
          {damageFlashKey != null && (
            <div
              className="avatar-damage-flash absolute inset-0 rounded pointer-events-none"
              style={{ backgroundColor: damageFlashColor ?? '#ffffff' }}
            />
          )}
        </div>
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
