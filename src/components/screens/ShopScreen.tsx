import type { Dispatch } from 'react';
import type { GameState } from '../../types';
import type { GameAction } from '../../reducers/gameReducer';
import { SHOP_ITEMS } from '../../data/shopItems';
import { GoldDisplay } from '../ui/GoldDisplay';
import { Button } from '../ui/Button';
import { ProgressBar } from '../ui/ProgressBar';
import { PlayerLoadout } from '../ui/PlayerLoadout';
import { StatsPanel } from '../ui/StatsPanel';

interface ShopScreenProps {
  gameState: GameState;
  dispatch: Dispatch<GameAction>;
}

export function ShopScreen({ gameState, dispatch }: ShopScreenProps) {
  const { player } = gameState;

  return (
    <div className="min-h-screen bg-theme-base flex flex-col">
      {/* Header */}
      <div className="bg-theme-surface border-b border-border-mid px-6 py-4 flex items-center justify-between">
        <h1 className="font-pixel text-accent text-sm">🛒 Shop</h1>
        <GoldDisplay gold={player.gold} />
        <Button variant="ghost" onClick={() => dispatch({ type: 'GO_TO_OPPONENT_SELECT' })}>
          ← Continue
        </Button>
      </div>

      <div className="flex flex-1 gap-0 overflow-hidden">
        {/* Shop items */}
        <div className="flex-1 p-6 overflow-y-auto">
          {/* Player vitals */}
          <div className="bg-theme-surface rounded-xl border border-border-mid p-4 mb-6 flex gap-4">
            <div className="flex-1">
              <ProgressBar label="HP" value={player.hp} max={player.maxHp} autoColor />
            </div>
            <div className="flex-1">
              <ProgressBar label="MP" value={player.mp} max={player.maxMp} color="bg-bar-mp" />
            </div>
          </div>

          <h2 className="font-pixel text-xs text-text-muted mb-4">Items</h2>
          <div className="grid grid-cols-2 gap-3">
            {SHOP_ITEMS.map(item => {
              const canAfford = player.gold >= item.cost;
              return (
                <div
                  key={item.id}
                  className={`rounded-xl border p-4 flex flex-col gap-2 ${
                    canAfford ? 'border-border-strong bg-theme-surface/60' : 'border-border-mid bg-theme-surface/30 opacity-60'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{item.icon}</span>
                    <div>
                      <div className="font-bold text-sm text-text-bright">{item.name}</div>
                      <div className="text-xs text-text-muted">{item.description}</div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between mt-auto">
                    <span className={`text-sm font-bold ${canAfford ? 'text-accent' : 'text-text-faint'}`}>
                      💰 {item.cost}g
                    </span>
                    <Button
                      variant="primary"
                      disabled={!canAfford}
                      onClick={() => dispatch({ type: 'BUY_SHOP_ITEM', itemId: item.id })}
                    >
                      Buy
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Sidebar: stats + loadout */}
        <div className="w-80 shrink-0 border-l border-border-mid p-4 overflow-y-auto bg-theme-muted/50 flex flex-col gap-4">
          <StatsPanel player={player} dispatch={dispatch} />
          <PlayerLoadout player={player} dispatch={dispatch} />
        </div>
      </div>
    </div>
  );
}
