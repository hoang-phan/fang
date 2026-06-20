import type { EquipmentItem, ItemQuality, ItemCategory } from '../types';
import { generateEquipmentItem } from './equipment';

// Base drop chance % by opponent level (parabolic, capped at 50%)
// Formula: min(50, 10 + (level-1)^2 * 0.9)
function baseDropChance(level: number): number {
  return Math.min(50, 10 + Math.pow(level - 1, 2) * 0.9);
}

// Quality probability table indexed by opponent level
// Each entry: [rude%, normal%, rare%, legendary%] — must sum to 100
const QUALITY_TABLE: Record<number, [number, number, number, number]> = {
  1: [100, 0,  0,  0],
  2: [95,  5,  0,  0],
  3: [85,  10,  0,  0],
  4: [80,  15, 5,  0],
  5: [70,  25, 5,  0],
  6: [50,  35, 10, 5],
};
const QUALITY_TABLE_HIGH: [number, number, number, number] = [30, 40, 20, 10];

const QUALITIES: ItemQuality[] = ['rude', 'normal', 'rare', 'legendary'];

const ALL_CATEGORIES: ItemCategory[] = [
  'headgear', 'bodyArmor', 'weapon', 'shield', 'amulet',
  'ring', 'ring', 'gauntlets', 'boots', 'charm', 'charm', 'charm',
];

function rollQualityFromTable(weights: [number, number, number, number]): ItemQuality {
  let roll = Math.random() * 100;
  for (let i = 0; i < weights.length; i++) {
    roll -= weights[i];
    if (roll <= 0) return QUALITIES[i];
  }
  return 'rude';
}

export function rollDrop(opponentLevel: number, dropChanceBoostPct: number = 0): EquipmentItem | null {
  const base = baseDropChance(opponentLevel);
  const adjusted = base * (1 + dropChanceBoostPct / 100);
  if (Math.random() * 100 > adjusted) return null;

  const weights = opponentLevel >= 7 ? QUALITY_TABLE_HIGH : (QUALITY_TABLE[opponentLevel] ?? QUALITY_TABLE[1]);
  const quality = rollQualityFromTable(weights);
  const category = ALL_CATEGORIES[Math.floor(Math.random() * ALL_CATEGORIES.length)];
  return generateEquipmentItem(category, quality);
}
