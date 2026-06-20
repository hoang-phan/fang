import type { Dispatch } from 'react';
import type { GameState } from '../../types';
import type { GameAction } from '../../reducers/gameReducer';
import { SHOP_ITEMS } from '../../data/shopItems';
import { equipmentCost, SLOT_LABELS } from '../../utils/equipment';
import { GoldDisplay } from '../ui/GoldDisplay';
import { Button } from '../ui/Button';
import { ProgressBar } from '../ui/ProgressBar';
import { PlayerLoadout } from '../ui/PlayerLoadout';
import { StatsPanel } from '../ui/StatsPanel';
import { EquipmentPanel } from '../ui/EquipmentPanel';

const QUALITY_TEXT: Record<string, string> = {
  rude:      'text-[#8a8a8a]',
  normal:    'text-[#6cb4e4]',
  rare:      'text-[#f5c842]',
  legendary: 'text-[#c77dff]',
};

const QUALITY_BORDER: Record<string, string> = {
  rude:      'border-[#8a8a8a]/50',
  normal:    'border-[#6cb4e4]/50',
  rare:      'border-[#f5c842]/50',
  legendary: 'border-[#c77dff]/50',
};

const QUALITY_LABELS: Record<string, string> = {
  rude: 'Rude', normal: 'Normal', rare: 'Rare', legendary: 'Legendary',
};

const ENHANCEMENT_LABELS: Record<string, string> = {
  hpBoost: 'Max HP',
  mpBoost: 'Max MP',
  damageBoost: 'Damage',
  defenseBoost: 'Defense',
  elementDamage: 'Elem. Dmg',
  hpRegen: 'HP/turn',
  mpRegen: 'MP/turn',
  elementResist: 'Resist',
};

interface ShopScreenProps {
  gameState: GameState;
  dispatch: Dispatch<GameAction>;
}

export function ShopScreen({ gameState, dispatch }: ShopScreenProps) {
  const { player } = gameState;

  return (
    <div className="min-h-screen bg-theme-base flex flex-col">
      {/* Header */}
      <div className="bg-theme-surface border-b border-border-mid px-4 lg:px-6 py-3 lg:py-4 flex items-center justify-between gap-2">
        <h1 className="font-pixel text-accent text-sm">🛒 Shop</h1>
        <GoldDisplay gold={player.gold} />
        <Button variant="ghost" onClick={() => dispatch({ type: 'GO_TO_OPPONENT_SELECT' })}>
          ← Continue
        </Button>
      </div>

      <div className="flex flex-col lg:flex-row flex-1 gap-0 overflow-hidden">
        {/* Shop items */}
        <div className="flex-1 p-4 lg:p-6 overflow-y-auto">
          {/* Player vitals */}
          <div className="bg-theme-surface rounded-xl border border-border-mid p-4 mb-6 flex gap-4">
            <div className="flex-1">
              <ProgressBar label="HP" value={player.hp} max={player.maxHp} autoColor />
            </div>
            <div className="flex-1">
              <ProgressBar label="MP" value={player.mp} max={player.maxMp} color="bg-bar-mp" />
            </div>
          </div>

          {/* Equipment for sale */}
          <h2 className="font-pixel text-xs text-text-muted mb-4">Equipment</h2>
          <div className="flex flex-col gap-3 mb-8">
            {gameState.shopEquipment.map(item => {
              const cost = equipmentCost(item);
              const canAfford = player.gold >= cost;
              return (
                <div
                  key={item.id}
                  className={`rounded-xl border p-3 flex gap-3 transition-opacity ${
                    canAfford
                      ? `${QUALITY_BORDER[item.quality]} bg-theme-surface/60`
                      : `${QUALITY_BORDER[item.quality]} bg-theme-surface/30 opacity-60`
                  }`}
                >
                  <span className="text-3xl shrink-0 mt-1">{item.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className={`font-bold text-sm ${QUALITY_TEXT[item.quality]}`}>{item.name}</div>
                    <div className="text-xs text-text-muted">{QUALITY_LABELS[item.quality]} · {SLOT_LABELS[item.slot]}</div>
                    {item.baseDamage != null && (
                      <div className="text-xs text-orange-400">⚔️ {item.baseDamage} base dmg</div>
                    )}
                    {item.baseDefense != null && (
                      <div className="text-xs text-blue-400">🛡️ {item.baseDefense} base def</div>
                    )}
                    {item.enhancements.map((enh, i) => (
                      <div key={i} className="text-xs text-text-muted">
                        +{enh.value} {enh.element ? `${enh.element} ` : ''}{ENHANCEMENT_LABELS[enh.type] ?? enh.type}
                      </div>
                    ))}
                  </div>
                  <div className="flex flex-col items-end justify-between shrink-0 gap-2">
                    <span className={`text-sm font-bold ${canAfford ? 'text-yellow-400' : 'text-text-faint'}`}>
                      💰 {cost}g
                    </span>
                    <Button
                      variant="primary"
                      disabled={!canAfford}
                      onClick={() => dispatch({ type: 'BUY_EQUIPMENT', itemId: item.id })}
                    >
                      Buy
                    </Button>
                  </div>
                </div>
              );
            })}
            {gameState.shopEquipment.length === 0 && (
              <p className="text-xs text-text-faint text-center py-4">No equipment in stock this visit.</p>
            )}
          </div>

          {/* Permanent stat items */}
          <h2 className="font-pixel text-xs text-text-muted mb-4">Items</h2>
          <div className="grid grid-cols-2 gap-3">
            {SHOP_ITEMS.map(item => {
              const canAfford = player.gold >= item.cost;
              return (
                <div
                  key={item.id}
                  className={`rounded-xl border p-3 lg:p-4 flex flex-col gap-2 ${
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

        {/* Sidebar: stats + equipment + loadout */}
        <div className="w-full lg:w-80 shrink-0 border-t lg:border-t-0 lg:border-l border-border-mid p-4 overflow-y-auto bg-theme-muted/50 flex flex-col gap-4">
          <StatsPanel player={player} dispatch={dispatch} />
          <EquipmentPanel player={player} dispatch={dispatch} />
          <PlayerLoadout player={player} dispatch={dispatch} />
        </div>
      </div>
    </div>
  );
}
