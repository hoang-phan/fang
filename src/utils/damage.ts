import type { Move, ElementType, PlayerStatBonuses } from '../types';

// Effectiveness multipliers: TYPE_CHART[moveType][defenderType]
// 2 = super effective, 0.5 = not very effective, 0 = immune, 1 (default) = normal
const TYPE_CHART: Partial<Record<ElementType, Partial<Record<ElementType, number>>>> = {
  fire: {
    grass: 2,
    ice: 2,
    water: 0.5,
    fire: 0.5,
    earth: 0.5,
  },
  water: {
    fire: 2,
    earth: 2,
    water: 0.5,
    grass: 0.5,
    electric: 0.5,
  },
  electric: {
    water: 2,
    normal: 2,
    earth: 0,
    electric: 0.5,
    grass: 0.5,
  },
  grass: {
    water: 2,
    earth: 2,
    fire: 0.5,
    grass: 0.5,
    poison: 0.5,
  },
  ice: {
    grass: 2,
    earth: 2,
    fire: 0.5,
    water: 0.5,
    ice: 0.5,
  },
  poison: {
    grass: 2,
    psychic: 0.5,
    dark: 0.5,
    poison: 0.5,
  },
  earth: {
    fire: 2,
    electric: 2,
    poison: 2,
    grass: 0.5,
  },
  dark: {
    psychic: 2,
    dark: 0.5,
  },
  psychic: {
    poison: 2,
    dark: 0,
    psychic: 0.5,
  },
};

const TYPE_ICONS: Record<ElementType, string> = {
  normal: '⚫',
  fire: '🔥',
  water: '💧',
  electric: '⚡',
  grass: '🌿',
  ice: '❄️',
  poison: '☠️',
  earth: '🌍',
  dark: '🌑',
  psychic: '🔮',
};

export function getTypeIcon(type: ElementType): string {
  return TYPE_ICONS[type];
}

export function getTypeEffectiveness(moveType: ElementType, defenderType: ElementType): number {
  return TYPE_CHART[moveType]?.[defenderType] ?? 1;
}

export function calcMoveEffect(
  move: Move,
  defenderType?: ElementType,
  statBonuses?: PlayerStatBonuses,
): number {
  const levelMult = 1 + (move.level - 1) * 0.25;
  const base = move.baseDamage * levelMult;
  const spread = Math.abs(base) * move.damageVariance;
  const raw = base + (Math.random() * spread * 2 - spread);
  let result = base < 0 ? Math.round(raw) : Math.max(1, Math.round(raw));

  // Apply flat stat bonus for the move's element type (damage moves only)
  if (statBonuses && move.baseDamage > 0) {
    result += statBonuses?.[move.type] ?? 0;
    result = Math.max(1, result);
  }

  if (defenderType && move.baseDamage > 0) {
    const effectiveness = getTypeEffectiveness(move.type, defenderType);
    return effectiveness === 0 ? 0 : Math.max(1, Math.round(result * effectiveness));
  }

  return result;
}

// Returns the deterministic min/max damage range for display (no random roll)
export function moveDamageRange(
  move: Move,
  statBonuses?: PlayerStatBonuses,
  defenderType?: ElementType,
): { min: number; max: number } | null {
  if (move.baseDamage === 0) return null;

  const levelMult = 1 + (move.level - 1) * 0.25;
  const base = move.baseDamage * levelMult;
  const spread = Math.abs(base) * move.damageVariance;
  const bonus = (statBonuses && move.baseDamage > 0) ? (statBonuses[move.type] ?? 0) : 0;

  let lo = base - spread + bonus;
  let hi = base + spread + bonus;

  if (move.baseDamage > 0) {
    lo = Math.max(1, Math.round(lo));
    hi = Math.max(1, Math.round(hi));

    if (defenderType) {
      const eff = getTypeEffectiveness(move.type, defenderType);
      if (eff === 0) return { min: 0, max: 0 };
      lo = Math.max(1, Math.round(lo * eff));
      hi = Math.max(1, Math.round(hi * eff));
    }
  } else {
    lo = Math.round(lo);
    hi = Math.round(hi);
  }

  return { min: Math.min(lo, hi), max: Math.max(lo, hi) };
}

export function effectivenessLabel(effectiveness: number): string | null {
  if (effectiveness === 2) return "It's super effective!";
  if (effectiveness === 0.5) return "It's not very effective...";
  if (effectiveness === 0) return "It had no effect!";
  return null;
}
