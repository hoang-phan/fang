import type {
  EquipmentItem, EquippedItems, EquipmentStatDeltas,
  ItemSlot, ItemCategory, ItemQuality, Enhancement, EnhancementType, ElementType,
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

export const CATEGORY_ICONS: Record<ItemCategory, string> = {
  headgear:  '🪖',
  bodyArmor: '🥋',
  weapon:    '⚔️',
  shield:    '🛡️',
  amulet:    '📿',
  ring:      '💍',
  gauntlets: '🥊',
  boots:     '👢',
  charm:     '🔮',
};

export const CATEGORY_LABELS: Record<ItemCategory, string> = {
  headgear:  'Headgear',
  bodyArmor: 'Body Armor',
  weapon:    'Weapon',
  shield:    'Shield',
  amulet:    'Amulet',
  ring:      'Ring',
  gauntlets: 'Gauntlets',
  boots:     'Boots',
  charm:     'Charm',
};

// Maps each ItemSlot to its ItemCategory
export const SLOT_TO_CATEGORY: Record<ItemSlot, ItemCategory> = {
  headgear:  'headgear',
  bodyArmor: 'bodyArmor',
  weapon:    'weapon',
  shield:    'shield',
  amulet:    'amulet',
  ringLeft:  'ring',
  ringRight: 'ring',
  gauntlets: 'gauntlets',
  boots:     'boots',
  charm1:    'charm',
  charm2:    'charm',
  charm3:    'charm',
};

// Maps each ItemCategory to the slots it can fill
export const CATEGORY_SLOTS: Record<ItemCategory, ItemSlot[]> = {
  headgear:  ['headgear'],
  bodyArmor: ['bodyArmor'],
  weapon:    ['weapon'],
  shield:    ['shield'],
  amulet:    ['amulet'],
  ring:      ['ringLeft', 'ringRight'],
  gauntlets: ['gauntlets'],
  boots:     ['boots'],
  charm:     ['charm1', 'charm2', 'charm3'],
};

const DEFENSE_CATEGORIES: ItemCategory[] = ['headgear', 'bodyArmor', 'gauntlets', 'boots', 'shield'];

// ─── Affix tier system ────────────────────────────────────────────────────────
//
// Each affix type has 5 tiers. Rolling an affix picks a random tier from the
// allowed range for that item quality. Same affix type on the same item stacks
// (values are summed). Cost scales with total tier sum across all affixes.
//
// Tier indices: 0 (weakest) → 4 (strongest)

export interface AffixTier {
  min: number;  // inclusive min value
  max: number;  // inclusive max value
  cost: number; // gold cost contribution for this tier
}

export const AFFIX_TIERS: Record<EnhancementType, AffixTier[]> = {
  hpBoost:        [{ min:1, max:3, cost:4 }, { min:4, max:6, cost:8 }, { min:7, max:10, cost:14 }, { min:11, max:15, cost:22 }, { min:16, max:22, cost:34 }],
  mpBoost:        [{ min:1, max:2, cost:3 }, { min:3, max:5, cost:6 }, { min:6, max:8, cost:11 }, { min:9, max:12, cost:18 }, { min:13, max:18, cost:28 }],
  hpRegen:        [{ min:1, max:1, cost:5 }, { min:1, max:2, cost:10 }, { min:2, max:3, cost:18 }, { min:3, max:4, cost:28 }, { min:4, max:6, cost:42 }],
  mpRegen:        [{ min:1, max:1, cost:5 }, { min:1, max:2, cost:10 }, { min:2, max:3, cost:18 }, { min:3, max:4, cost:28 }, { min:4, max:5, cost:40 }],
  damageBoost:    [{ min:1, max:2, cost:6 }, { min:3, max:5, cost:12 }, { min:6, max:9, cost:20 }, { min:10, max:14, cost:32 }, { min:15, max:20, cost:50 }],
  defenseBoost:   [{ min:1, max:2, cost:5 }, { min:3, max:4, cost:10 }, { min:5, max:7, cost:17 }, { min:8, max:10, cost:27 }, { min:11, max:15, cost:42 }],
  elementDamage:  [{ min:1, max:2, cost:5 }, { min:3, max:5, cost:10 }, { min:6, max:8, cost:17 }, { min:9, max:12, cost:27 }, { min:13, max:18, cost:42 }],
  elementResist:  [{ min:2, max:3, cost:4 }, { min:4, max:6, cost:8 }, { min:7, max:10, cost:14 }, { min:11, max:15, cost:22 }, { min:16, max:22, cost:34 }],
  goldLootBoost:  [{ min:3, max:5, cost:4 }, { min:6, max:10, cost:8 }, { min:11, max:16, cost:14 }, { min:17, max:24, cost:22 }, { min:25, max:35, cost:34 }],
  dropChanceBoost:[{ min:2, max:4, cost:4 }, { min:5, max:8, cost:8 }, { min:9, max:13, cost:14 }, { min:14, max:20, cost:22 }, { min:21, max:30, cost:34 }],
};

// Quality controls which tier range is accessible when rolling
const QUALITY_TIER_RANGE: Record<ItemQuality, [number, number]> = {
  rude:      [0, 0],  // tier 0 only (rude items have no affixes, but range defined for completeness)
  normal:    [0, 2],  // tiers 0–2
  rare:      [1, 3],  // tiers 1–3
  legendary: [2, 4],  // tiers 2–4
};

// How many affix rolls per quality (same as before, but rolls can now stack)
const AFFIX_ROLL_COUNT: Record<ItemQuality, number> = {
  rude: 0, normal: 1, rare: 2, legendary: 3,
};

// Base item cost (before affix tier cost is added)
const QUALITY_BASE_COST: Record<ItemQuality, number> = {
  rude: 10, normal: 20, rare: 40, legendary: 80,
};

const ALL_ELEMENTS: ElementType[] = [
  'normal','fire','water','electric','grass','ice','poison','earth','dark','psychic',
];

// ─── Enhancement pool per slot ────────────────────────────────────────────────

function allowedEnhancements(category: ItemCategory): EnhancementType[] {
  const base: EnhancementType[] = ['hpBoost', 'mpBoost', 'hpRegen', 'mpRegen', 'elementDamage', 'elementResist', 'goldLootBoost', 'dropChanceBoost'];
  if (category === 'weapon') base.push('damageBoost');
  if (DEFENSE_CATEGORIES.includes(category)) base.push('defenseBoost');
  return base;
}

function randInt(min: number, max: number): number {
  return min + Math.floor(Math.random() * (max - min + 1));
}

// Rolls one affix at a random tier within the quality's allowed range.
// Returns the enhancement and the tier index (for cost calculation).
function rollAffixAtTier(type: EnhancementType, quality: ItemQuality): { enhancement: Enhancement; tierIndex: number } {
  const [minTier, maxTier] = QUALITY_TIER_RANGE[quality];
  const tierIndex = randInt(minTier, maxTier);
  const tier = AFFIX_TIERS[type][tierIndex];
  const value = randInt(tier.min, tier.max);
  if (type === 'elementDamage' || type === 'elementResist') {
    const element = ALL_ELEMENTS[Math.floor(Math.random() * ALL_ELEMENTS.length)];
    return { enhancement: { type, value, element }, tierIndex };
  }
  return { enhancement: { type, value }, tierIndex };
}

// ─── Item names ───────────────────────────────────────────────────────────────

const WEAPON_NAMES: Record<ItemQuality, string[]> = {
  rude:      ['Cracked Blade', 'Bent Knife', 'Rusty Sword'],
  normal:    ['Iron Sword', 'Short Blade', 'War Dagger'],
  rare:      ['Engraved Falchion', 'Etched Cleaver', 'Runic Glaive'],
  legendary: ['Doomfang', 'Soulreaver', 'Dawnbreaker'],
};

const CATEGORY_NAMES: Partial<Record<ItemCategory, Record<ItemQuality, string[]>>> = {
  headgear:  { rude:['Cloth Hood'], normal:['Iron Helm'], rare:['Runic Circlet'], legendary:['Crown of Ages'] },
  bodyArmor: { rude:['Torn Tunic'], normal:['Chainmail'], rare:['Plate Cuirass'], legendary:['Dragonscale Armor'] },
  shield:    { rude:['Buckler'], normal:['Kite Shield'], rare:['Tower Shield'], legendary:['Aegis of the Ancients'] },
  gauntlets: { rude:['Cloth Wraps'], normal:['Iron Gauntlets'], rare:['Runic Grips'], legendary:['Godfist'] },
  boots:     { rude:['Worn Sandals'], normal:['Iron Greaves'], rare:['Runic Treads'], legendary:['Windwalkers'] },
  amulet:    { rude:['Bone Bead'], normal:['Silver Pendant'], rare:['Runic Amulet'], legendary:['Eye of the Void'] },
  ring:      { rude:['Copper Band'], normal:['Silver Ring'], rare:['Gold Ring'], legendary:['Ring of the Ancients'] },
  charm:     { rude:['Pebble'], normal:['Minor Charm'], rare:['Grand Charm'], legendary:['Hellfire Charm'] },
};

function pickName(category: ItemCategory, quality: ItemQuality): string {
  if (category === 'weapon') {
    const names = WEAPON_NAMES[quality];
    return names[Math.floor(Math.random() * names.length)];
  }
  const names = CATEGORY_NAMES[category]?.[quality];
  if (names && names.length > 0) return names[Math.floor(Math.random() * names.length)];
  return `${quality} ${CATEGORY_LABELS[category]}`;
}

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

// ─── Main generator ───────────────────────────────────────────────────────────

export function generateEquipmentItem(category: ItemCategory, quality: ItemQuality): EquipmentItem {
  const id = `eq_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
  const name = pickName(category, quality);
  const icon = CATEGORY_ICONS[category];
  const rollCount = AFFIX_ROLL_COUNT[quality];

  const pool = allowedEnhancements(category);

  // Roll affixes — same type can be rolled multiple times and stacks
  // element-specific types (elementDamage/elementResist) stack per element
  const affixMap = new Map<string, Enhancement>();
  let totalTierCost = 0;

  for (let i = 0; i < rollCount; i++) {
    const type = pool[Math.floor(Math.random() * pool.length)] as EnhancementType;
    const { enhancement, tierIndex } = rollAffixAtTier(type, quality);
    totalTierCost += AFFIX_TIERS[type][tierIndex].cost;

    // Stack key: for elemental types include the element so fire and water stack separately
    const stackKey = enhancement.element ? `${type}_${enhancement.element}` : type;

    const existing = affixMap.get(stackKey);
    if (existing) {
      affixMap.set(stackKey, { ...existing, value: existing.value + enhancement.value });
    } else {
      affixMap.set(stackKey, enhancement);
    }
  }

  const enhancements = Array.from(affixMap.values());

  const item: EquipmentItem = { id, category, quality, name, icon, enhancements };

  if (category === 'weapon') {
    const [min, max] = BASE_DAMAGE_RANGES[quality];
    item.baseDamage = randInt(min, max);
  } else if (DEFENSE_CATEGORIES.includes(category)) {
    const [min, max] = BASE_DEFENSE_RANGES[quality];
    item.baseDefense = randInt(min, max);
  }

  // Attach tier cost for pricing (stored transiently — not persisted but recalculated)
  item._affixTierCost = totalTierCost;

  return item;
}

// ─── Shop stock generator ─────────────────────────────────────────────────────

const ALL_CATEGORIES: ItemCategory[] = [
  'headgear','bodyArmor','weapon','shield','amulet','ring','ring','gauntlets','boots','charm','charm','charm',
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
  const shuffled = [...ALL_CATEGORIES].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count).map(category => generateEquipmentItem(category, rollQuality()));
}

// ─── Cost ─────────────────────────────────────────────────────────────────────
//
// Item cost = base quality cost + sum of affix tier costs.
// If _affixTierCost is not stored (e.g. items from older saves), fall back to
// recalculating a rough estimate from affix values.

export function equipmentCost(item: EquipmentItem): number {
  const base = QUALITY_BASE_COST[item.quality];
  const tierCost = item._affixTierCost ?? estimateAffixTierCost(item);
  return base + tierCost;
}

function estimateAffixTierCost(item: EquipmentItem): number {
  // Rough estimate for legacy items: use mid-tier cost per affix
  return item.enhancements.length * 12;
}

// Returns a tier label (I–V) for a given enhancement value by finding which tier it falls in.
// Stacked affixes may exceed the max of tier V — those are shown as "V+" to indicate over-tier.
export function getAffixTierLabel(enh: Enhancement): string {
  const tiers = AFFIX_TIERS[enh.type];
  for (let i = tiers.length - 1; i >= 0; i--) {
    if (enh.value >= tiers[i].min) return ['I', 'II', 'III', 'IV', 'V'][i] + (enh.value > tiers[i].max ? '+' : '');
  }
  return 'I';
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
    goldLootBoostPct: 0,
    dropChanceBoostPct: 0,
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
        case 'goldLootBoost':   result.goldLootBoostPct += enh.value; break;
        case 'dropChanceBoost': result.dropChanceBoostPct += enh.value; break;
      }
    }
  }

  return result;
}

/** Pick 4–6 items from the backend pool, re-rolling affixes so stats are randomized each shop visit. */
export function pickShopEquipment(pool: EquipmentItem[] | undefined): EquipmentItem[] {
  if (!pool || pool.length === 0) return generateShopEquipment();
  const shuffled = [...pool].sort(() => Math.random() - 0.5);
  const count = 4 + Math.floor(Math.random() * 3);
  return shuffled.slice(0, Math.min(count, shuffled.length)).map(
    item => generateEquipmentItem(item.category, item.quality)
  );
}
