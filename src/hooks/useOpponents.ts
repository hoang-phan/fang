import { useState, useEffect } from 'react';
import type { OpponentDef, OpponentCinematic, OpponentGift, Conversation, EquipmentItem } from '../types';
import {
  saveOpponentsCache, loadOpponentsCache,
  saveItemsCache, loadItemsCache,
} from '../utils/storage';

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

function enrichOpponents(data: OpponentDef[]): OpponentDef[] {
  return data.map(opp => ({
    baseDefense: 0,
    ...opp,
    avatars: opp.avatars?.map(path => prefixUrl(path)),
    cinematics: opp.cinematics?.map((c: OpponentCinematic) => ({
      ...c,
      conversations: prefixConversations(c.conversations),
    })),
    gifts: opp.gifts?.map((g: OpponentGift) => ({
      ...g,
      conversations: prefixConversations(g.conversations),
    })),
    conversations: prefixConversations(opp.conversations),
  }));
}

export function useOpponents(): { opponents: OpponentDef[]; loading: boolean } {
  const cached = loadOpponentsCache();
  const [opponents, setOpponents] = useState<OpponentDef[]>(cached ?? []);
  const [loading, setLoading] = useState(cached === null);

  useEffect(() => {
    fetch(`${API_BASE}/api/v1/opponents`)
      .then(r => r.json())
      .then((data: OpponentDef[]) => {
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
