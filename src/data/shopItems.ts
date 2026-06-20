import type { ShopItem } from '../types';

export const SHOP_ITEMS: ShopItem[] = [
  {
    id: 'hp_up',
    name: 'HP Up',
    description: '+20 Max HP permanently.',
    type: 'max_hp_up',
    cost: 50,
    value: 20,
    icon: '❤️',
  },
  {
    id: 'mp_up',
    name: 'MP Up',
    description: '+10 Max MP permanently.',
    type: 'max_mp_up',
    cost: 50,
    value: 10,
    icon: '💙',
  },
];
