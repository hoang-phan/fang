import { useState, useEffect } from 'react';
import type { OpponentDef, OpponentCinematic, OpponentGift, Conversation, EquipmentItem } from '../types';

export const API_BASE = 'http://localhost:3000';

function prefixUrl(url: string): string {
  return url.startsWith('http') ? url : `${API_BASE}${url}`;
}

function prefixConversations(conversations?: Conversation[]): Conversation[] | undefined {
  return conversations?.map(conv => ({
    ...conv,
    backgroundUrl: conv.backgroundUrl ? prefixUrl(conv.backgroundUrl) : undefined,
  }));
}

export function useOpponents(): { opponents: OpponentDef[]; loading: boolean } {
  const [opponents, setOpponents] = useState<OpponentDef[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API_BASE}/api/v1/opponents`)
      .then(r => r.json())
      .then((data: OpponentDef[]) => {
        setOpponents(data.map(opp => ({
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
        })));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return { opponents, loading };
}

export function useItems(): { items: EquipmentItem[]; loading: boolean } {
  const [items, setItems] = useState<EquipmentItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API_BASE}/api/v1/items`)
      .then(r => r.json())
      .then((data: EquipmentItem[]) => setItems(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return { items, loading };
}
