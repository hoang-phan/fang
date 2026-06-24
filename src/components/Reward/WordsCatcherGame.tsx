import { useEffect, useRef, useState } from 'react';

const POSITIVE_WORDS = [
  'love', 'hope', 'joy', 'kind', 'warm', 'brave', 'true', 'friend', 'smile',
  'peace', 'glow', 'strong', 'shine', 'free', 'pure', 'grace', 'calm', 'light', 'safe', 'loyal',
];
const NEGATIVE_WORDS = [
  'hate', 'fear', 'cold', 'dark', 'weak', 'lie', 'hurt', 'alone', 'lost', 'rude',
  'bitter', 'cruel', 'vile', 'dread', 'scorn', 'hollow', 'shame', 'spite', 'grim', 'bleak',
];

const BAR_STEPS = 20;
const BAR_START = 0;
const CATCHER_HALF = 0.12; // half of 0.24 catcher width

function getFallSpeed(elapsed: number): number {
  return Math.min(0.45, 0.18 + elapsed * 0.0047);
}

function getSpawnInterval(elapsed: number): number {
  return Math.max(600, 1500 - elapsed * 20);
}

interface FallingWord {
  id: number;
  text: string;
  positive: boolean;
  x: number;
  y: number;
  speed: number;
  caught: boolean;
  missed: boolean;
  divRef: React.RefObject<HTMLDivElement>;
}

interface WordsCatcherGameProps {
  description: string;
  onWin: () => void;
  onLose: () => void;
  onMoveLeft: (fn: () => void) => void;
  onMoveRight: (fn: () => void) => void;
  onLevelChange?: (fill: number) => void; // 0.0–1.0, drives video opacity/rate
}

function MobileButton({ side, onPress }: { side: 'left' | 'right'; onPress: () => void }) {
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const start = (e: React.PointerEvent) => {
    e.preventDefault();
    onPress();
    intervalRef.current = setInterval(onPress, 80);
  };
  const stop = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
  };
  return (
    <button
      className={`absolute bottom-20 ${side === 'left' ? 'left-4' : 'right-14'} w-14 h-14 rounded-full bg-black/40 border border-white/20 flex items-center justify-center text-2xl text-white/80 z-10 pointer-events-auto`}
      onPointerDown={start}
      onPointerUp={stop}
      onPointerLeave={stop}
    >
      {side === 'left' ? '←' : '→'}
    </button>
  );
}

export function WordsCatcherGame({ description, onWin, onLose, onMoveLeft, onMoveRight, onLevelChange }: WordsCatcherGameProps) {
  const [barLevel, setBarLevel] = useState(BAR_START);
  const [phase, setPhase] = useState<'playing' | 'won' | 'lost'>('playing');
  const [catcherX, setCatcherX] = useState(0.5);
  const [words, setWords] = useState<FallingWord[]>([]);

  const barLevelRef = useRef(BAR_START);
  const phaseRef = useRef<'playing' | 'won' | 'lost'>('playing');
  const catcherXRef = useRef(0.5);
  const wordsRef = useRef<FallingWord[]>([]);
  const elapsedRef = useRef(0);
  const lastTimestampRef = useRef<number | null>(null);
  const lastSpawnRef = useRef(0);
  const rafIdRef = useRef<number | null>(null);
  const nextIdRef = useRef(0);

  const moveLeft = () => {
    if (phaseRef.current !== 'playing') return;
    catcherXRef.current = Math.max(CATCHER_HALF, catcherXRef.current - 0.06);
    setCatcherX(catcherXRef.current);
  };

  const moveRight = () => {
    if (phaseRef.current !== 'playing') return;
    catcherXRef.current = Math.min(1 - CATCHER_HALF, catcherXRef.current + 0.06);
    setCatcherX(catcherXRef.current);
  };

  useEffect(() => { onMoveLeft(moveLeft); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { onMoveRight(moveRight); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    function tick(timestamp: number) {
      if (phaseRef.current !== 'playing') return;

      const dt = lastTimestampRef.current != null
        ? (timestamp - lastTimestampRef.current) / 1000
        : 0;
      lastTimestampRef.current = timestamp;
      elapsedRef.current += dt;

      // Spawn a new word?
      if (timestamp - lastSpawnRef.current > getSpawnInterval(elapsedRef.current)) {
        lastSpawnRef.current = timestamp;
        const positive = Math.random() < 0.55;
        const pool = positive ? POSITIVE_WORDS : NEGATIVE_WORDS;
        const text = pool[Math.floor(Math.random() * pool.length)];
        const newWord: FallingWord = {
          id: nextIdRef.current++,
          text,
          positive,
          x: 0.05 + Math.random() * 0.75,
          y: 0,
          speed: getFallSpeed(elapsedRef.current) * (0.85 + Math.random() * 0.30),
          caught: false,
          missed: false,
          divRef: { current: null } as React.RefObject<HTMLDivElement>,
        };
        wordsRef.current = [...wordsRef.current, newWord];
        setWords([...wordsRef.current]);
      }

      // Move all words and check collisions.
      // Bar is at bottom: barLevel * 100 / BAR_STEPS, so its top edge in normalized coords = 1 - barLevel * 100 / BAR_STEPS
      const barTopY = 1 - barLevelRef.current / BAR_STEPS;
      let barDelta = 0;
      let structuralChange = false;
      const cx = catcherXRef.current;

      for (const w of wordsRef.current) {
        if (w.caught || w.missed) continue;
        w.y += w.speed * dt;

        const wordCenterX = w.x + 0.04;
        const inXRange = wordCenterX >= cx - CATCHER_HALF && wordCenterX <= cx + CATCHER_HALF;
        // Catch when word top edge enters a ±6% window centred on the bar top edge
        const inYRange = w.y >= barTopY - 0.04 && w.y <= barTopY + 0.08;

        if (inXRange && inYRange) {
          w.caught = true;
          barDelta += w.positive ? 1 : -1;
          structuralChange = true;
        } else if (w.y > barTopY + 0.08) {
          w.missed = true;
          if (w.positive) barDelta -= 1;
          structuralChange = true;
        } else if (w.divRef.current) {
          w.divRef.current.style.top = `${w.y * 100}%`;
        }
      }

      // Apply bar delta
      if (barDelta !== 0) {
        const newLevel = Math.max(0, Math.min(BAR_STEPS, barLevelRef.current + barDelta));
        barLevelRef.current = newLevel;
        setBarLevel(newLevel);
        onLevelChange?.(newLevel / BAR_STEPS);

        if (newLevel >= BAR_STEPS) {
          phaseRef.current = 'won';
          setPhase('won');
          return;
        }
        if (newLevel <= 0) {
          phaseRef.current = 'lost';
          setPhase('lost');
          return;
        }
      }

      // Flush removed words to React
      if (structuralChange) {
        const active = wordsRef.current.filter(w => !w.missed && !w.caught);
        wordsRef.current = active;
        setWords([...active]);
      }

      rafIdRef.current = requestAnimationFrame(tick);
    }

    rafIdRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafIdRef.current != null) cancelAnimationFrame(rafIdRef.current);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

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

  const statusLabel = phase === 'won'
    ? 'You did it! 🎉'
    : phase === 'lost'
    ? 'Not this time...'
    : (description || 'catch the good words');

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">

      {/* Falling words */}
      {words.map(w => (
        <div
          key={w.id}
          ref={w.divRef}
          className={`absolute font-pixel text-xs pointer-events-none px-1 py-0.5 rounded select-none drop-shadow-md ${
            w.positive ? 'text-green-200 bg-green-900/60' : 'text-red-200 bg-red-900/60'
          }`}
          style={{ left: `${w.x * 100}%`, top: `${w.y * 100}%`, fontSize: '20px', fontWeight: 'bold' }}
        >
          {w.text}
        </div>
      ))}

      {/* Catcher bar — sits at bottom 10%, center of the catch zone */}
      <div
        className="absolute h-3 bg-yellow-400 rounded-full shadow-[0_0_10px_#facc15]"
        style={{
          bottom: `${barLevel * 100 / BAR_STEPS}%`,
          width: `${CATCHER_HALF * 2 * 100}%`,
          left: `${(catcherX - CATCHER_HALF) * 100}%`,
        }}
      />

      {/* Vertical level bar — spans full screen height, right edge */}
      <div className="absolute right-3 inset-y-0 flex flex-col-reverse justify-between items-center py-3 pointer-events-none">
        {Array.from({ length: BAR_STEPS + 1 }, (_, i) => (
          <div
            key={i}
            className={`w-2 h-2 rounded-full transition-all duration-150 ${
              i === barLevel
                ? 'bg-yellow-400 shadow-[0_0_8px_#facc15]'
                : i < barLevel
                ? 'bg-yellow-600/70'
                : 'bg-white/20'
            }`}
          />
        ))}
      </div>

      {/* WIN / LOSE labels */}
      <div className="absolute right-7 top-3 font-pixel text-[7px] text-green-400 pointer-events-none">WIN</div>
      <div className="absolute right-7 bottom-3 font-pixel text-[7px] text-red-400 pointer-events-none">LOSE</div>

      {/* Status label */}
      <div className="absolute bottom-6 left-0 right-10 text-center font-pixel text-[10px] text-white/60 pointer-events-none drop-shadow-md">
        {statusLabel}
      </div>

      {/* Mobile overlay buttons — pointer-events enabled */}
      {phase === 'playing' && (
        <>
          <MobileButton side="left" onPress={moveLeft} />
          <MobileButton side="right" onPress={moveRight} />
        </>
      )}
    </div>
  );
}
