import type { Move } from '../types';

export const BASIC_ATTACK: Move = {
  id: 'attack', name: 'Attack', icon: '⚔️',
  description: 'A reliable physical strike.',
  mpCost: 0, baseDamage: 12, damageVariance: 0.25,
  level: 1, maxLevel: 1, type: 'normal',
};
