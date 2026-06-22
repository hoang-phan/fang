import { useEffect, useRef, useState } from 'react';

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
  const [phase, setPhase] = useState<'playing' | 'won' | 'lost'>('playing');
  const fillRef = useRef(START_FILL);
  const phaseRef = useRef<'playing' | 'won' | 'lost'>('playing');
  const startedRef = useRef(false);

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
      phaseRef.current = 'won';
      setPhase('won');
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
        phaseRef.current = 'lost';
        setPhase('lost');
      }
    }, 200);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (phase === 'won') {
      const t = setTimeout(onWin, 2000);
      return () => clearTimeout(t);
    }
    if (phase === 'lost') {
      const t = setTimeout(onLose, 900);
      return () => clearTimeout(t);
    }
  }, [phase, onWin, onLose]);

  const barColor = phase === 'won'
    ? '#22c55e'
    : phase === 'lost'
    ? '#ef4444'
    : fill > 0.5 ? '#facc15' : '#f97316';

  const label = phase === 'won' ? 'You did it! 🎉' : phase === 'lost' ? 'Not this time...' : description;

  return (
    <div className="relative shrink-0 pb-1 px-4 mx-auto w-full">
      <div className="relative w-full h-14 bg-theme-surface rounded-full overflow-hidden border border-border-mid opacity-[0.4]">
        <div
          className="absolute inset-0 rounded-full"
          style={{ width: `${fill * 100}%`, backgroundColor: barColor, transition: 'background-color 0.2s' }}
        />
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="font-pixel text-xl tracking-[5px] text-transform-uppercase text-white drop-shadow-md">{label}</span>
        </div>
      </div>
    </div>
  );
}
