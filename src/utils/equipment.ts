import type {
  EquipmentItem, EquippedItems, EquipmentStatDeltas,
  ItemSlot, ItemQuality, Enhancement, EnhancementType, ElementType,
} from '../types';

// ─── Slot metadata ─────────────────────────────────────────────────────────────

export const SLOT_ICONS: Record<ItemSlot, string> = {
  headgear:  '🪖',
  bodyArmor: '🥋',
  weapon:    '⚔️',
  shield:    '🛡️',
  amulet:    '📿',
  ringLeft:  '💍',
  ringRight: '💍',
  gauntlets: '🥊',
  boots:     '👢',
  charm1:    '🔮',
  charm2:    '🔮',
  charm3:    '🔮',
};

export const SLOT_LABELS: Record<ItemSlot, string> = {
  headgear:  'Headgear',
  bodyArmor: 'Body Armor',
  weapon:    'Weapon',
  shield:    'Shield',
  amulet:    'Amulet',
  ringLeft:  'Ring (L)',
  ringRight: 'Ring (R)',
  gauntlets: 'Gauntlets',
  boots:     'Boots',
  charm1:    'Charm I',
  charm2:    'Charm II',
  charm3:    'Charm III',
};

const DEFENSE_SLOTS: ItemSlot[] = ['headgear', 'bodyArmor', 'gauntlets', 'boots', 'shield'];

// ─── Enhancement value ranges by quality ──────────────────────────────────────

const ENHANCEMENT_RANGES: Record<ItemQuality, Record<EnhancementType, [number, number]>> = {
  rude:      { hpBoost:[0,0], mpBoost:[0,0], damageBoost:[0,0], defenseBoost:[0,0], elementDamage:[0,0], hpRegen:[0,0], mpRegen:[0,0], elementResist:[0,0] },
  normal:    { hpBoost:[5,15], mpBoost:[3,8], damageBoost:[1,4], defenseBoost:[1,3], elementDamage:[1,4], hpRegen:[1,3], mpRegen:[1,2], elementResist:[2,6] },
  rare:      { hpBoost:[12,30], mpBoost:[6,16], damageBoost:[3,8], defenseBoost:[2,6], elementDamage:[3,8], hpRegen:[2,5], mpRegen:[2,4], elementResist:[5,12] },
  legendary: { hpBoost:[25,60], mpBoost:[12,30], damageBoost:[6,15], defenseBoost:[5,12], elementDamage:[6,15], hpRegen:[4,10], mpRegen:[3,8], elementResist:[10,20] },
};

const BASE_DAMAGE_RANGES: Record<ItemQuality, [number, number]> = {
  rude:      [2, 6],
  normal:    [5, 12],
  rare:      [10, 20],
  legendary: [18, 30],
};

const BASE_DEFENSE_RANGES: Record<ItemQuality, [number, number]> = {
  rude:      [1, 3],
  normal:    [2, 6],
  rare:      [5, 10],
  legendary: [8, 16],
};

const ALL_ELEMENTS: ElementType[] = [
  'normal','fire','water','electric','grass','ice','poison','earth','dark','psychic',
];

// ─── Enhancement pool per slot ────────────────────────────────────────────────

function allowedEnhancements(slot: ItemSlot): EnhancementType[] {
  const base: EnhancementType[] = ['hpBoost', 'mpBoost', 'hpRegen', 'mpRegen', 'elementDamage', 'elementResist'];
  if (slot === 'weapon') base.push('damageBoost');
  if (DEFENSE_SLOTS.includes(slot)) base.push('defenseBoost');
  return base;
}

function randInt(min: number, max: number): number {
  return min + Math.floor(Math.random() * (max - min + 1));
}

function rollEnhancement(type: EnhancementType, quality: ItemQuality): Enhancement {
  const [min, max] = ENHANCEMENT_RANGES[quality][type];
  const value = randInt(min, max);
  if (type === 'elementDamage' || type === 'elementResist') {
    const element = ALL_ELEMENTS[Math.floor(Math.random() * ALL_ELEMENTS.length)];
    return { type, value, element };
  }
  return { type, value };
}

// ─── Item names ───────────────────────────────────────────────────────────────

const WEAPON_NAMES: Record<ItemQuality, string[]> = {
  rude:      ['Cracked Blade', 'Bent Knife', 'Rusty Sword'],
  normal:    ['Iron Sword', 'Short Blade', 'War Dagger'],
  rare:      ['Engraved Falchion', 'Etched Cleaver', 'Runic Glaive'],
  legendary: ['Doomfang', 'Soulreaver', 'Dawnbreaker'],
};

const ARMOR_NAMES: Partial<Record<ItemSlot, Record<ItemQuality, string[]>>> = {
  headgear:  { rude:['Cloth Hood'], normal:['Iron Helm'], rare:['Runic Circlet'], legendary:['Crown of Ages'] },
  bodyArmor: { rude:['Torn Tunic'], normal:['Chainmail'], rare:['Plate Cuirass'], legendary:['Dragonscale Armor'] },
  shield:    { rude:['Buckler'], normal:['Kite Shield'], rare:['Tower Shield'], legendary:['Aegis of the Ancients'] },
  gauntlets: { rude:['Cloth Wraps'], normal:['Iron Gauntlets'], rare:['Runic Grips'], legendary:['Godfist'] },
  boots:     { rude:['Worn Sandals'], normal:['Iron Greaves'], rare:['Runic Treads'], legendary:['Windwalkers'] },
  amulet:    { rude:['Bone Bead'], normal:['Silver Pendant'], rare:['Runic Amulet'], legendary:['Eye of the Void'] },
  ringLeft:  { rude:['Copper Band'], normal:['Silver Ring'], rare:['Gold Ring'], legendary:['Ring of the Ancients'] },
  ringRight: { rude:['Copper Band'], normal:['Silver Ring'], rare:['Gold Ring'], legendary:['Ring of the Ancients'] },
  charm1:    { rude:['Pebble'], normal:['Minor Charm'], rare:['Grand Charm'], legendary:['Hellfire Charm'] },
  charm2:    { rude:['Pebble'], normal:['Minor Charm'], rare:['Grand Charm'], legendary:['Hellfire Charm'] },
  charm3:    { rude:['Pebble'], normal:['Minor Charm'], rare:['Grand Charm'], legendary:['Hellfire Charm'] },
};

function pickName(slot: ItemSlot, quality: ItemQuality): string {
  if (slot === 'weapon') {
    const names = WEAPON_NAMES[quality];
    return names[Math.floor(Math.random() * names.length)];
  }
  const names = ARMOR_NAMES[slot]?.[quality];
  if (names && names.length > 0) return names[Math.floor(Math.random() * names.length)];
  return `${quality} ${SLOT_LABELS[slot]}`;
}

// ─── Enhancement count per quality ───────────────────────────────────────────

const ENHANCEMENT_COUNT: Record<ItemQuality, number> = {
  rude: 0, normal: 1, rare: 2, legendary: 3,
};

// ─── Main generator ───────────────────────────────────────────────────────────

export function generateEquipmentItem(slot: ItemSlot, quality: ItemQuality): EquipmentItem {
  const id = `eq_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
  const name = pickName(slot, quality);
  const icon = SLOT_ICONS[slot];
  const count = ENHANCEMENT_COUNT[quality];

  const pool = allowedEnhancements(slot);
  const picked: Enhancement[] = [];
  const usedTypes = new Set<string>();

  for (let i = 0; i < count && pool.length > 0; i++) {
    const available = pool.filter(t => !usedTypes.has(t));
    if (available.length === 0) break;
    const type = available[Math.floor(Math.random() * available.length)];
    usedTypes.add(type);
    picked.push(rollEnhancement(type, quality));
  }

  const item: EquipmentItem = { id, slot, quality, name, icon, enhancements: picked };

  if (slot === 'weapon') {
    const [min, max] = BASE_DAMAGE_RANGES[quality];
    item.baseDamage = randInt(min, max);
  } else if (DEFENSE_SLOTS.includes(slot)) {
    const [min, max] = BASE_DEFENSE_RANGES[quality];
    item.baseDefense = randInt(min, max);
  }

  return item;
}

// ─── Shop stock generator ─────────────────────────────────────────────────────

const ALL_SLOTS: ItemSlot[] = [
  'headgear','bodyArmor','weapon','shield','amulet',
  'ringLeft','ringRight','gauntlets','boots','charm1','charm2','charm3',
];

const QUALITY_WEIGHTS: [ItemQuality, number][] = [
  ['rude', 20], ['normal', 45], ['rare', 28], ['legendary', 7],
];

function rollQuality(): ItemQuality {
  const total = QUALITY_WEIGHTS.reduce((s, [, w]) => s + w, 0);
  let r = Math.random() * total;
  for (const [q, w] of QUALITY_WEIGHTS) {
    r -= w;
    if (r <= 0) return q;
  }
  return 'normal';
}

export function generateShopEquipment(): EquipmentItem[] {
  const count = 4 + Math.floor(Math.random() * 3); // 4, 5, or 6
  const shuffled = [...ALL_SLOTS].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count).map(slot => generateEquipmentItem(slot, rollQuality()));
}

// ─── Cost ─────────────────────────────────────────────────────────────────────

const QUALITY_BASE_COST: Record<ItemQuality, number> = {
  rude: 15, normal: 40, rare: 90, legendary: 220,
};

export function equipmentCost(item: EquipmentItem): number {
  return QUALITY_BASE_COST[item.quality];
}

// ─── Stat computation ─────────────────────────────────────────────────────────

export function computeEquipmentStats(equipped: EquippedItems): EquipmentStatDeltas {
  const result: EquipmentStatDeltas = {
    bonusDamage: 0,
    bonusDefense: 0,
    hpBoost: 0,
    mpBoost: 0,
    hpRegen: 0,
    mpRegen: 0,
    elementDamage: {},
    // TODO: wire elementResist into battleReducer damage formula (additive with stat-point elemental bonuses on the defender side)
    elementResist: {},
  };

  for (const item of Object.values(equipped) as EquipmentItem[]) {
    if (!item) continue;
    if (item.baseDamage) result.bonusDamage += item.baseDamage;
    if (item.baseDefense) result.bonusDefense += item.baseDefense;

    for (const enh of item.enhancements) {
      switch (enh.type) {
        case 'hpBoost':      result.hpBoost += enh.value; break;
        case 'mpBoost':      result.mpBoost += enh.value; break;
        case 'hpRegen':      result.hpRegen += enh.value; break;
        case 'mpRegen':      result.mpRegen += enh.value; break;
        case 'damageBoost':  result.bonusDamage += enh.value; break;
        case 'defenseBoost': result.bonusDefense += enh.value; break;
        case 'elementDamage':
          if (enh.element) {
            result.elementDamage[enh.element] = (result.elementDamage[enh.element] ?? 0) + enh.value;
          }
          break;
        case 'elementResist':
          if (enh.element) {
            result.elementResist[enh.element] = (result.elementResist[enh.element] ?? 0) + enh.value;
          }
          break;
      }
    }
  }

  return result;
}
