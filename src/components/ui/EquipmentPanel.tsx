import type { Dispatch } from 'react';
import type { PlayerStats, ItemSlot, EquipmentItem } from '../../types';
import type { GameAction } from '../../reducers/gameReducer';
import { SLOT_ICONS, SLOT_LABELS, CATEGORY_ICONS, CATEGORY_LABELS, CATEGORY_SLOTS, equipmentCost, getAffixTierLabel } from '../../utils/equipment';

function resolveEquipSlot(item: EquipmentItem, equipped: PlayerStats['equipped']): ItemSlot {
  const slots = CATEGORY_SLOTS[item.category];
  return slots.find(s => !equipped[s]) ?? slots[0];
}

const ALL_SLOTS: ItemSlot[] = [
  'headgear', 'bodyArmor', 'weapon', 'shield', 'amulet',
  'ringLeft', 'ringRight', 'gauntlets', 'boots',
  'charm1', 'charm2', 'charm3',
];

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
  hpRegen: 'HP Regen/turn',
  mpRegen: 'MP Regen/turn',
  elementResist: 'Elem. Resist',
  goldLootBoost: 'Gold Loot %',
  dropChanceBoost: 'Drop Chance %',
};

interface Props {
  player: PlayerStats;
  dispatch: Dispatch<GameAction>;
}

export function EquipmentPanel({ player, dispatch }: Props) {
  const hasAnything = player.inventory.length > 0 || Object.keys(player.equipped).length > 0;

  return (
    <div className="bg-theme-surface border border-border-mid rounded-xl p-4">
      <h3 className="font-pixel text-xs text-text-normal mb-3">Equipment</h3>

      {/* 13-slot grid */}
      <div className="grid grid-cols-4 gap-1.5 mb-4">
        {ALL_SLOTS.map(slot => {
          const item = player.equipped[slot];
          return (
            <button
              key={slot}
              title={item ? `${item.name} — click to unequip` : SLOT_LABELS[slot]}
              onClick={() => item && dispatch({ type: 'UNEQUIP_ITEM', slot })}
              className={`rounded-lg border p-1.5 flex flex-col items-center gap-0.5 min-h-[52px] text-center transition-colors
                ${item
                  ? `${QUALITY_BORDER[item.quality]} bg-theme-raised cursor-pointer hover:bg-theme-hover`
                  : 'border-border-subtle bg-theme-raised/30 cursor-default'
                }`}
            >
              <span className="text-base leading-none">{item ? item.icon : SLOT_ICONS[slot]}</span>
              <span className={`text-[8px] leading-tight w-full overflow-hidden text-ellipsis whitespace-nowrap ${item ? QUALITY_TEXT[item.quality] : 'text-text-faint'}`}>
                {item ? item.name : SLOT_LABELS[slot]}
              </span>
            </button>
          );
        })}
      </div>

      {/* Inventory list */}
      {player.inventory.length > 0 && (
        <>
          <h4 className="font-pixel text-[9px] text-text-muted mb-2">Inventory</h4>
          <div className="flex flex-col gap-2 max-h-64 overflow-y-auto pr-1">
            {player.inventory.map(item => (
              <div
                key={item.id}
                className={`rounded-lg border p-2 flex items-start gap-2 bg-theme-raised/40 ${QUALITY_BORDER[item.quality]}`}
              >
                <span className="text-xl shrink-0 mt-0.5">{item.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className={`text-xs font-bold ${QUALITY_TEXT[item.quality]}`}>{item.name}</div>
                  <div className="text-[10px] text-text-faint">{QUALITY_LABELS[item.quality]} {CATEGORY_LABELS[item.category]}</div>
                  {item.baseDamage != null && (
                    <div className="text-[10px] text-orange-400">⚔️ {item.baseDamage} base dmg</div>
                  )}
                  {item.baseDefense != null && (
                    <div className="text-[10px] text-blue-400">🛡️ {item.baseDefense} base def</div>
                  )}
                  {item.enhancements.map((enh, i) => (
                    <div key={i} className="text-[10px] text-text-muted flex items-center gap-1">
                      <span className="text-[9px] font-bold text-text-faint opacity-70">[{getAffixTierLabel(enh)}]</span>
                      +{enh.value} {enh.element ? `${enh.element} ` : ''}{ENHANCEMENT_LABELS[enh.type] ?? enh.type}
                    </div>
                  ))}
                </div>
                <div className="flex flex-col gap-1 shrink-0">
                  <button
                    onClick={() => dispatch({ type: 'EQUIP_ITEM', itemId: item.id, slot: resolveEquipSlot(item, player.equipped) })}
                    className="text-[10px] px-2 py-1 bg-yellow-500 hover:bg-yellow-400 text-black rounded font-bold cursor-pointer"
                  >
                    Equip
                  </button>
                  <button
                    onClick={() => dispatch({ type: 'SELL_ITEM', itemId: item.id })}
                    className="text-[10px] px-2 py-1 bg-theme-hover hover:bg-red-900/40 text-text-muted hover:text-red-400 border border-border-mid rounded font-bold cursor-pointer"
                    title={`Sell for ${Math.floor(equipmentCost(item) * 0.4)}g`}
                  >
                    {Math.floor(equipmentCost(item) * 0.4)}g
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {!hasAnything && (
        <p className="text-[10px] text-text-faint text-center py-2">No equipment yet — buy gear in the shop!</p>
      )}
    </div>
  );
}
