import { useState, useEffect } from 'react';
import type { OpponentDef } from '../types';

const API_BASE = 'http://localhost:3000';

export function useOpponents(): { opponents: OpponentDef[]; loading: boolean } {
  const [opponents, setOpponents] = useState<OpponentDef[]>([]);
  const [loading, setLoading] = useState(true);

  const addCinematicBaseUrl = (path: string) => path.split(',').map(p => `${API_BASE}${p.trim()}`).filter(Boolean).join(',');

  useEffect(() => {
    fetch(`${API_BASE}/api/v1/opponents`)
      .then(r => r.json())
      .then((data: OpponentDef[]) => {
        setOpponents(data.map(opp => ({
          baseDefense: 0,
          ...opp,
          avatars: opp.avatars?.map(path => `${API_BASE}${path}`),
          cinematics: opp.cinematics?.map(addCinematicBaseUrl),
        })));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return { opponents, loading };
}
