import { useCallback, useEffect, useRef, useState } from 'react';
import { getTransitionColorHex } from '../../utils/color';
import { useMiniGameOutcome } from './useMiniGameOutcome';

const GRID = 4;
const TOTAL = GRID * GRID;
const BLANK = TOTAL - 1; // bottom-right tile is the hole
const GAME_DURATION_S = 300; // 5 minutes

// Returns a solvable shuffled board (hole at index BLANK initially,
// then slide-shuffled via valid moves so it's always solvable).
function makeSolvedBoard(): number[] {
  return Array.from({ length: TOTAL }, (_, i) => i);
}

function getNeighbors(pos: number): number[] {
  const row = Math.floor(pos / GRID);
  const col = pos % GRID;
  const neighbors: number[] = [];
  if (row > 0) neighbors.push(pos - GRID);
  if (row < GRID - 1) neighbors.push(pos + GRID);
  if (col > 0) neighbors.push(pos - 1);
  if (col < GRID - 1) neighbors.push(pos + 1);
  return neighbors;
}

function shuffle(board: number[], moves = 300): number[] {
  const b = [...board];
  let holePos = b.indexOf(BLANK);
  let lastHole = -1;
  for (let i = 0; i < moves; i++) {
    const neighbors = getNeighbors(holePos).filter(n => n !== lastHole);
    const pick = neighbors[Math.floor(Math.random() * neighbors.length)];
    // swap pick with hole
    [b[holePos], b[pick]] = [b[pick], b[holePos]];
    lastHole = holePos;
    holePos = pick;
  }
  return b;
}

function isSolved(board: number[]): boolean {
  return board.every((v, i) => v === i);
}

interface ShufflePuzzleGameProps {
  description: string; // extracted from content string, used as label
  imageUrl: string;    // sprite image to cut into tiles
  onWin: () => void;
  onLose: () => void;
  onProgressChange?: (fill: number) => void; // 0.0–1.0, drives video effects
}

export function ShufflePuzzleGame({ description, imageUrl, onWin, onLose, onProgressChange }: ShufflePuzzleGameProps) {
  const [board, setBoard] = useState<number[]>(() => shuffle(makeSolvedBoard()));
  const { phase, phaseRef, advance } = useMiniGameOutcome(onWin, onLose);

  const boardRef = useRef(board);
  const elapsedRef = useRef(0);
  const lastTsRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);
  const barFillRef = useRef<HTMLDivElement>(null);
  const timerLabelRef = useRef<HTMLDivElement>(null);

  useEffect(() => { boardRef.current = board; }, [board]);

  const trySlide = useCallback((tilePos: number) => {
    if (phaseRef.current !== 'playing') return;
    const b = boardRef.current;
    const holePos = b.indexOf(BLANK);
    if (!getNeighbors(holePos).includes(tilePos)) return;
    const next = [...b];
    [next[holePos], next[tilePos]] = [next[tilePos], next[holePos]];
    boardRef.current = next;
    setBoard(next);
    if (isSolved(next)) {
      advance('won');
    }
  }, [advance, phaseRef]);

  // Timer loop — updates bar imperatively to avoid React re-render bottleneck
  useEffect(() => {
    function tick(ts: number) {
      if (phaseRef.current !== 'playing') return;
      const dt = lastTsRef.current != null ? (ts - lastTsRef.current) / 1000 : 0;
      lastTsRef.current = ts;
      elapsedRef.current = Math.min(GAME_DURATION_S, elapsedRef.current + dt);
      const fraction = elapsedRef.current / GAME_DURATION_S;
      const pct = fraction * 100;

      if (barFillRef.current) {
        barFillRef.current.style.height = `${pct}%`;
        barFillRef.current.style.backgroundColor = getTransitionColorHex('#fff', '#c0406a', fraction);
      }
      if (timerLabelRef.current) {
        timerLabelRef.current.textContent = `${Math.ceil(GAME_DURATION_S - elapsedRef.current)}s`;
      }
      onProgressChange?.(fraction);

      if (elapsedRef.current >= GAME_DURATION_S) {
        advance('lost');
        return;
      }
      rafRef.current = requestAnimationFrame(tick);
    }
    rafRef.current = requestAnimationFrame(tick);
    return () => { if (rafRef.current != null) cancelAnimationFrame(rafRef.current); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const holePos = board.indexOf(BLANK);

  const TILE_SIZE = 56; // px; 4×4 = 224px grid
  const GRID_PX = TILE_SIZE * GRID;

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {/* Progress bar — imperatively updated from RAF loop */}
      <div className="absolute right-3 inset-y-0 flex flex-col items-center py-2 gap-1 pointer-events-none">
        <div className={`font-pixel text-2xl mb-1 ${phase === 'won' ? 'text-pulse' : phase === 'lost' ? '' : 'text-text-muted'}`}>
          {phase === 'lost' ? '💔' : description}
        </div>
        <div className="flex-1 w-3 bg-theme-surface rounded-full overflow-hidden border border-border-subtle flex flex-col-reverse">
          <div ref={barFillRef} className="rounded-full" style={{ height: '0%', backgroundColor: '#fff' }} />
        </div>
      </div>

      {/* Puzzle grid — centred */}
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
        {/* Timer label */}
        <div ref={timerLabelRef} className="font-pixel text-xs text-text-muted">
          {GAME_DURATION_S}s
        </div>

        <div
          className="relative border-2 border-border-mid rounded-lg overflow-hidden pointer-events-auto"
          style={{ width: GRID_PX, height: GRID_PX }}
        >
          {board.map((tileValue, tilePos) => {
            if (tilePos === holePos) return null;
            const srcRow = Math.floor(tileValue / GRID);
            const srcCol = tileValue % GRID;
            const dstRow = Math.floor(tilePos / GRID);
            const dstCol = tilePos % GRID;
            const isNeighbor = getNeighbors(holePos).includes(tilePos);
            return (
              <div
                key={tileValue}
                onClick={() => trySlide(tilePos)}
                style={{
                  position: 'absolute',
                  width: TILE_SIZE,
                  height: TILE_SIZE,
                  left: dstCol * TILE_SIZE,
                  top: dstRow * TILE_SIZE,
                  backgroundImage: `url(${imageUrl})`,
                  backgroundSize: `${GRID_PX}px ${GRID_PX}px`,
                  backgroundPosition: `-${srcCol * TILE_SIZE}px -${srcRow * TILE_SIZE}px`,
                  cursor: isNeighbor && phase === 'playing' ? 'pointer' : 'default',
                  transition: 'left 0.1s, top 0.1s',
                  border: '1px solid rgba(255,255,255,0.15)',
                  boxSizing: 'border-box',
                  outline: isNeighbor && phase === 'playing' ? '2px solid rgba(192,64,106,0.7)' : 'none',
                }}
              />
            );
          })}

          {/* Hole */}
          <div
            style={{
              position: 'absolute',
              width: TILE_SIZE,
              height: TILE_SIZE,
              left: (holePos % GRID) * TILE_SIZE,
              top: Math.floor(holePos / GRID) * TILE_SIZE,
              backgroundColor: '#111',
            }}
          />

          {/* Win/loss overlay */}
          {phase !== 'playing' && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/60 font-pixel text-center text-sm">
              {phase === 'won'
                ? <span className="text-pink-300 text-pulse">Solved!</span>
                : <span className="text-red-400">Time up!</span>
              }
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
