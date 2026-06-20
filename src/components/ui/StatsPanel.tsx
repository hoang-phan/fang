import { useState } from 'react';
import type { Dispatch } from 'react';
import type { PlayerStats, ElementType } from '../../types';
import type { GameAction, StatPointTarget } from '../../reducers/gameReducer';
import { xpToNextLevel } from '../../utils/xp';
import { getTypeIcon } from '../../utils/damage';
import { ProgressBar } from './ProgressBar';

const ALL_ELEMENTS: ElementType[] = [
  'normal', 'fire', 'water', 'electric', 'grass',
  'ice', 'poison', 'earth', 'dark', 'psychic',
];

const ELEMENT_NAMES: Record<ElementType, string> = {
  normal: 'Normal',
  fire: 'Fire',
  water: 'Water',
  electric: 'Electric',
  grass: 'Grass',
  ice: 'Ice',
  poison: 'Poison',
  earth: 'Earth',
  dark: 'Dark',
  psychic: 'Psychic',
};

interface StatsPanelProps {
  player: PlayerStats;
  dispatch: Dispatch<GameAction>;
}

export function StatsPanel({ player, dispatch }: StatsPanelProps) {
  const xpNeeded = xpToNextLevel(player.level);
  const hasPoints = player.statPoints > 0;

  // Collapsed by default on mobile; the lg: sidebar is always visible so
  // we default open there via CSS (the state only controls the mobile toggle).
  const [open, setOpen] = useState(false);

  const body = (
    <>
      {/* Level & XP */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-1">
          <span className="font-pixel text-xs text-accent">Lv {player.level}</span>
          <span className="text-xs text-text-muted">{player.xp} / {xpNeeded} XP</span>
        </div>
        <ProgressBar label="" value={player.xp} max={xpNeeded} color="bg-accent-muted" />
      </div>

      {/* Unspent points badge */}
      {hasPoints && (
        <div className="mb-3 px-3 py-2 rounded-lg bg-accent-subtle border border-accent-border text-xs text-accent">
          ✨ {player.statPoints} stat point{player.statPoints !== 1 ? 's' : ''} to spend!
        </div>
      )}

      {/* Base stats */}
      <h3 className="font-pixel text-xs text-text-normal mb-2">Base Stats</h3>
      <div className="flex flex-col gap-1 mb-4">
        {([
          { key: 'baseDamage' as StatPointTarget, icon: '⚔️', label: 'Attack', value: player.baseDamage },
          { key: 'baseDefense' as StatPointTarget, icon: '🛡️', label: 'Defense', value: player.baseDefense },
        ]).map(({ key, icon, label, value }) => (
          <div key={key} className="flex items-center gap-2">
            <span className="w-4 text-center text-sm">{icon}</span>
            <span className="flex-1 text-xs text-text-normal">{label}</span>
            <span className="text-xs text-text-muted w-8 text-right">+{value}</span>
            {hasPoints && (
              <button
                onClick={() => dispatch({ type: 'SPEND_STAT_POINT', target: key })}
                className="text-xs px-2 py-0.5 bg-accent hover:bg-accent-hover text-accent-text rounded cursor-pointer font-bold"
              >
                +
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Elemental damage bonuses */}
      <h3 className="font-pixel text-xs text-text-normal mb-2">Damage Bonuses</h3>
      <div className="flex flex-col gap-1">
        {ALL_ELEMENTS.map(el => {
          const bonus = player.stats?.[el] ?? 0;
          return (
            <div key={el} className="flex items-center gap-2">
              <span className="w-4 text-center text-sm">{getTypeIcon(el)}</span>
              <span className="flex-1 text-xs text-text-normal">{ELEMENT_NAMES[el]}</span>
              <span className="text-xs text-text-muted w-8 text-right">+{bonus}</span>
              {hasPoints && (
                <button
                  onClick={() => dispatch({ type: 'SPEND_STAT_POINT', target: el })}
                  className="text-xs px-2 py-0.5 bg-accent hover:bg-accent-hover text-accent-text rounded cursor-pointer font-bold"
                >
                  +
                </button>
              )}
            </div>
          );
        })}
      </div>
    </>
  );

  return (
    <div className="bg-theme-surface border border-border-mid rounded-xl">
      {/* Mobile toggle header — hidden on lg+ where panel is always open */}
      <button
        onClick={() => setOpen(o => !o)}
        className="lg:hidden w-full flex items-center justify-between px-4 py-3 cursor-pointer"
      >
        <span className="font-pixel text-xs text-text-normal">Stats</span>
        <div className="flex items-center gap-2">
          {hasPoints && (
            <span className="text-xs text-accent font-bold">✨ {player.statPoints} pts</span>
          )}
          <span className="text-text-muted text-xs">{open ? '▲' : '▼'}</span>
        </div>
      </button>

      {/* Body: always visible on lg+, toggled on mobile */}
      <div className={`px-4 pb-4 ${open ? 'block' : 'hidden'} lg:block lg:pt-4`}>
        {body}
      </div>
    </div>
  );
}
