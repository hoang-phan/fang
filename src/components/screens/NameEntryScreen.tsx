import { useState, type FormEvent } from 'react';
import type { GameAction } from '../../reducers/gameReducer';
import type { Dispatch } from 'react';

interface Props {
  dispatch: Dispatch<GameAction>;
}

export function NameEntryScreen({ dispatch }: Props) {
  const [name, setName] = useState('');

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    dispatch({ type: 'SET_PLAYER_NAME', name });
  }

  return (
    <div className="min-h-screen bg-theme-base flex flex-col items-center justify-center gap-8 px-4">
      <h1 className="font-pixel text-text-bright text-sm md:text-base text-center leading-loose">
        FANG
      </h1>

      <form onSubmit={handleSubmit} className="flex flex-col items-center gap-4 w-full max-w-xs">
        <label className="font-pixel text-text-muted text-xs text-center">
          Enter your name
        </label>
        <input
          type="text"
          value={name}
          onChange={e => setName(e.target.value)}
          maxLength={20}
          autoFocus
          className="w-full bg-theme-surface border border-border-mid rounded px-4 py-3 text-text-bright font-pixel text-xs text-center focus:outline-none focus:border-yellow-500"
          placeholder="Hero"
        />
        <button
          type="submit"
          disabled={!name.trim()}
          className="w-full bg-yellow-500 hover:bg-yellow-400 disabled:opacity-40 disabled:cursor-not-allowed text-black font-pixel text-xs py-3 rounded transition-colors"
        >
          START
        </button>
      </form>
    </div>
  );
}
