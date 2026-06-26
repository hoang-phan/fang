import { useEffect, useRef, useState } from 'react';
import { MiniGameProgressBar } from '../ui/MiniGameProgressBar';
import { useMiniGameOutcome } from '../../hooks/useMiniGameOutcome';

const DRAIN_RATE = 0.05;
const FILL_PER_CLICK = 0.014;
const TARGET_FILL = 1.0;
const START_FILL = 0.1;

interface ClickMiniGameProps {
  description: string;
  onWin: () => void;
  onLose: () => void;
  registerClick: (fn: () => void) => void;
  onFillChange?: (fill: number) => void;
}

export function ClickMiniGame({ description, onWin, onLose, registerClick, onFillChange }: ClickMiniGameProps) {
  const [fill, setFill] = useState(START_FILL);
  const fillRef = useRef(START_FILL);
  const startedRef = useRef(false);
  const { phase, phaseRef, advance } = useMiniGameOutcome(onWin, onLose);

  const handleClick = () => {
    if (phaseRef.current !== 'playing') return;
    if (!startedRef.current) {
      startedRef.current = true;
    }
    const next = Math.min(TARGET_FILL, fillRef.current + FILL_PER_CLICK);
    fillRef.current = next;
    setFill(next);
    onFillChange?.(next);
    if (next >= TARGET_FILL) {
      advance('won');
    }
  };

  useEffect(() => {
    registerClick(handleClick);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const id = setInterval(() => {
      if (!startedRef.current || phaseRef.current !== 'playing') return;
      const next = Math.max(0, fillRef.current - DRAIN_RATE / 5);
      fillRef.current = next;
      setFill(next);
      onFillChange?.(next);
      if (next <= 0) {
        advance('lost');
      }
    }, 200);
    return () => clearInterval(id);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <MiniGameProgressBar phase={phase} description={description} fillPct={fill * 100} />
  );
}
