import { useEffect, useRef, useState } from 'react';

export type MiniGamePhase = 'playing' | 'won' | 'lost';

const OUTCOME_DELAY_MS = 3000;

export function useMiniGameOutcome(onWin: () => void, onLose: () => void) {
  const [phase, setPhase] = useState<MiniGamePhase>('playing');
  const phaseRef = useRef<MiniGamePhase>('playing');

  const advance = (next: MiniGamePhase) => {
    phaseRef.current = next;
    setPhase(next);
  };

  useEffect(() => {
    if (phase === 'won') {
      const t = setTimeout(onWin, OUTCOME_DELAY_MS);
      return () => clearTimeout(t);
    }
    if (phase === 'lost') {
      const t = setTimeout(onLose, OUTCOME_DELAY_MS);
      return () => clearTimeout(t);
    }
  }, [phase, onWin, onLose]);

  return { phase, phaseRef, advance };
}
