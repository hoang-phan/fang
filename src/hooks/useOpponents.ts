import { useState, useEffect } from 'react';
import type { OpponentDef, OpponentCinematic, EquipmentItem } from '../types';

export const API_BASE = 'http://localhost:3000';

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
          avatars: opp.avatars?.map(path => `${API_BASE}${path}`),
          cinematics: opp.cinematics?.map((c: OpponentCinematic) => ({
            ...c,
            url: `${API_BASE}${c.url}`,
          })),
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
