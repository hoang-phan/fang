import { useState, useEffect } from 'react';
import type { OpponentDef, OpponentCinematic, OpponentGift, Conversation, EquipmentItem } from '../types';
import {
  saveOpponentsCache, loadOpponentsCache,
  saveItemsCache, loadItemsCache,
} from '../utils/storage';
import { expandGoldReward } from '../utils/xp';

export const API_BASE = 'http://localhost:3000';

function prefixUrl(url: string): string {
  return url.startsWith('http') ? url : `${API_BASE}${url}`;
}

function prefixConversations(conversations?: Conversation[]): Conversation[] | undefined {
  return conversations?.map(conv => ({
    ...conv,
    backgroundUrl: conv.backgroundUrl ? prefixUrl(conv.backgroundUrl) : undefined,
    chats: conv.chats.map(chat => ({
      ...chat,
      sprites: chat.sprites.map(s => ({ ...s, url: prefixUrl(s.url) })),
    })),
  }));
}


// Raw shape as the backend sends it — fields differ from OpponentDef
interface RawOpponent {
  id: string;
  name: string;
  sprite?: string;
  type: string;
  maxHp: number;
  baseDamage: number;
  baseDefense?: number;
  damageVariance: number;
  moves: OpponentDef['moves'];
  goldReward: number;       // single value; we expand to [min, max]
  xpReward: number;         // backend name for baseXp
  unlockAfter?: string[];
  flavourText?: string | null;
  level: number | null;
  avatar?: string;
  cinematics?: OpponentCinematic[];
  gifts?: OpponentGift[];
  conversations?: Conversation[];
}

function enrichOpponents(data: RawOpponent[]): OpponentDef[] {
  return data.map(opp => {
    const level = opp.level ?? 1;
    const goldRewardBase = opp.goldReward ?? 0;
    const baseXp = opp.xpReward ?? level * 50;
    return {
      baseDefense: 0,
      ...opp,
      level,
      sprite: opp.sprite ?? '❓',
      flavourText: opp.flavourText ?? '',
      baseXp,
      goldRewardBase,
      goldReward: expandGoldReward(goldRewardBase, level),
      avatar: opp.avatar ? prefixUrl(opp.avatar) : undefined,
      cinematics: opp.cinematics?.map((c: OpponentCinematic) => ({
        ...c,
        conversations: prefixConversations(c.conversations),
      })),
      gifts: opp.gifts?.map((g: OpponentGift) => ({
        ...g,
        conversations: prefixConversations(g.conversations),
      })),
      conversations: prefixConversations(opp.conversations),
    } as OpponentDef;
  });
}

export function useOpponents(): { opponents: OpponentDef[]; loading: boolean } {
  const cached = loadOpponentsCache();
  const [opponents, setOpponents] = useState<OpponentDef[]>(cached ?? []);
  const [loading, setLoading] = useState(cached === null);

  useEffect(() => {
    fetch(`${API_BASE}/api/v1/opponents`)
      .then(r => r.json())
      .then((data: RawOpponent[]) => {
        const enriched = enrichOpponents(data);
        saveOpponentsCache(enriched);
        setOpponents(enriched);
      })
      .catch(() => {
        // Server unreachable — cached data (if any) is already in state
      })
      .finally(() => setLoading(false));
  }, []);

  return { opponents, loading };
}

export function useItems(): { items: EquipmentItem[]; loading: boolean } {
  const cached = loadItemsCache();
  const [items, setItems] = useState<EquipmentItem[]>(cached ?? []);
  const [loading, setLoading] = useState(cached === null);

  useEffect(() => {
    fetch(`${API_BASE}/api/v1/items`)
      .then(r => r.json())
      .then((data: EquipmentItem[]) => {
        saveItemsCache(data);
        setItems(data);
      })
      .catch(() => {
        // Server unreachable — cached data (if any) is already in state
      })
      .finally(() => setLoading(false));
  }, []);

  return { items, loading };
}
