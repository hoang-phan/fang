import { useEffect, useRef } from 'react';
import type { BattleLogEntry, ElementType } from '../../types';

interface BattleLogProps {
  entries: BattleLogEntry[];
}

const ENTRY_COLORS: Record<BattleLogEntry['type'], string> = {
  player: 'text-blue-300',
  opponent: 'text-red-300',
  system: 'text-accent-muted',
};

const MOVE_TYPE_COLORS: Record<ElementType, string> = {
  normal:   'text-text-normal',
  fire:     'text-orange-400',
  water:    'text-cyan-400',
  electric: 'text-accent-muted',
  grass:    'text-green-400',
  ice:      'text-sky-300',
  poison:   'text-purple-400',
  earth:    'text-amber-600',
  dark:     'text-violet-400',
  psychic:  'text-pink-400',
};

export function BattleLog({ entries }: BattleLogProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [entries.length]);

  return (
    <div className="bg-theme-surface/60 border border-border-mid rounded-lg p-3 h-28 overflow-y-auto font-mono text-xs">
      {entries.slice(-20).map(entry => {
        const color = entry.moveType
          ? MOVE_TYPE_COLORS[entry.moveType]
          : ENTRY_COLORS[entry.type];
        return (
          <div key={entry.id} className={`mb-1 ${color}`}>
            &gt; {entry.text}
          </div>
        );
      })}
      <div ref={bottomRef} />
    </div>
  );
}
