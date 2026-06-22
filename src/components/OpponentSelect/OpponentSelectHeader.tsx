import type { Dispatch } from 'react';
import type { PlayerStats } from '../../types';
import type { GameAction } from '../../reducers/gameReducer';
import { GoldDisplay } from '../ui/GoldDisplay';
import { Button } from '../ui/Button';

interface OpponentSelectHeaderProps {
  player: PlayerStats;
  dispatch: Dispatch<GameAction>;
}

export function OpponentSelectHeader({ player, dispatch }: OpponentSelectHeaderProps) {
  return (
    <div className="bg-theme-surface border-b border-border-mid px-4 lg:px-6 py-3 lg:py-4 flex items-center justify-between gap-2 flex-wrap">
      <h1 className="font-pixel text-accent text-sm">⚔️ FANG</h1>
      <div className="flex items-center gap-2 lg:gap-4 flex-wrap">
        <div className="text-xs font-mono text-text-normal hidden sm:block">
          <span className="text-accent font-pixel">Lv {player.level}</span>
          <span className="mx-2 text-text-faint">|</span>
          <span className="text-green-400">{player.hp}</span>/{player.maxHp} HP
          <span className="mx-2 text-text-faint">|</span>
          <span className="text-blue-400">{player.mp}</span>/{player.maxMp} MP
        </div>
        <div className="text-xs font-mono text-text-normal sm:hidden">
          <span className="text-accent font-pixel">Lv {player.level}</span>
          <span className="mx-1 text-text-faint">|</span>
          <span className="text-green-400">{player.hp}</span>/<span className="text-blue-400">{player.mp}</span>
        </div>
        <GoldDisplay gold={player.gold} />
        <Button variant="ghost" onClick={() => dispatch({ type: 'GO_TO_SHOP' })}>
          🛒 Shop
        </Button>
      </div>
    </div>
  );
}
