import type { Dispatch } from 'react';
import type { Player } from '../../types';
import type { GameAction } from '../../reducers/gameReducer';
import { GoldDisplay } from '../ui/GoldDisplay';
import { Button } from '../ui/Button';

interface OpponentSelectHeaderProps {
  player: Player;
  dispatch: Dispatch<GameAction>;
}

export function OpponentSelectHeader({ player, dispatch }: OpponentSelectHeaderProps) {
  return (
    <div className="bg-theme-surface border-b border-border-mid px-6 py-4 flex items-center justify-between">
      <h1 className="font-pixel text-accent text-sm">⚔️ FANG</h1>
      <div className="flex items-center gap-4">
        <div className="text-xs font-mono text-text-normal">
          <span className="text-accent font-pixel">Lv {player.level}</span>
          <span className="mx-2 text-text-faint">|</span>
          <span className="text-green-400">{player.hp}</span>/{player.maxHp} HP
          <span className="mx-2 text-text-faint">|</span>
          <span className="text-blue-400">{player.mp}</span>/{player.maxMp} MP
        </div>
        <GoldDisplay gold={player.gold} />
        <Button variant="ghost" onClick={() => dispatch({ type: 'GO_TO_SHOP' })}>
          🛒 Shop
        </Button>
      </div>
    </div>
  );
}
