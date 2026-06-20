import type { Dispatch } from 'react';
import type { OpponentDef, OpponentProgress } from '../../types';
import type { GameAction } from '../../reducers/gameReducer';
import { ProgressBar } from '../ui/ProgressBar';
import { getTypeIcon } from '../../utils/damage';
import { getScaledOpponent, xpToNextLevel } from '../../utils/xp';

interface OpponentCardProps {
  opp: OpponentDef;
  oppProgress: OpponentProgress;
  unlocked: boolean;
  defeated: boolean;
  selected: boolean;
  dispatch: Dispatch<GameAction>;
}

export function OpponentCard({ opp, oppProgress, unlocked, defeated, selected, dispatch }: OpponentCardProps) {
  const scaled = getScaledOpponent(opp, oppProgress);
  const xpNeeded = xpToNextLevel(oppProgress.level);

  const avatarUrl = (() => {
    if (!unlocked) return undefined;
    const { avatars } = opp;
    if (!avatars?.length) return undefined;
    return avatars[Math.min(oppProgress.level, 5) - 1] ?? avatars[avatars.length - 1];
  })();

  return (
    <button
      disabled={!unlocked}
      onClick={() => dispatch({ type: 'SELECT_OPPONENT', opponentId: opp.id })}
      className={`
        w-full text-left rounded-xl border p-4 transition-all duration-150 cursor-pointer
        ${!unlocked ? 'opacity-40 cursor-not-allowed border-border-mid bg-theme-surface/30' :
          selected ? 'border-accent bg-accent-subtle' :
          'border-border-strong bg-theme-surface/60 hover:border-text-faint'
        }
      `}
    >
      <div className="flex items-center gap-3">
        {!unlocked
          ? <span className="text-3xl lg:text-4xl shrink-0">🔒</span>
          : avatarUrl
            ? <img src={avatarUrl} alt={opp.name} className="w-16 h-16 lg:w-24 lg:h-24 object-contain shrink-0" />
            : <span className="text-3xl lg:text-4xl shrink-0">{opp.sprite}</span>
        }
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className="font-bold text-text-bright text-sm">{opp.name}</span>
            <span className="text-xs text-purple-400 font-pixel">Lv {oppProgress.level}</span>
            {defeated && <span className="text-xs text-green-400">✓ Defeated</span>}
            {!unlocked && <span className="text-xs text-text-faint">Locked</span>}
          </div>
          <p className="text-xs text-text-muted truncate">{opp.flavourText}</p>
          <div className="flex items-center gap-2 lg:gap-3 mt-2 flex-wrap">
            <div className="w-20 lg:w-24">
              <ProgressBar label="HP" value={scaled.maxHp} max={scaled.maxHp} autoColor />
            </div>
            <span className="text-xs text-accent">💰 {opp.goldReward[0]}–{opp.goldReward[1]}g</span>
            <span className="text-xs text-text-muted">⭐ {opp.xpReward[0]} XP</span>
            <span className="text-sm">{getTypeIcon(opp.type)}</span>
          </div>
          <div className="mt-2 flex items-center gap-2">
            <div className="flex-1">
              <ProgressBar label="" value={oppProgress.xp} max={xpNeeded} color="bg-purple-500" />
            </div>
            <span className="text-xs text-text-faint">{oppProgress.xp}/{xpNeeded} XP</span>
          </div>
        </div>
        {selected && <span className="text-accent text-xl shrink-0">▶</span>}
      </div>
    </button>
  );
}
