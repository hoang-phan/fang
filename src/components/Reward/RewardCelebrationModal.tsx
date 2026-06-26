import { useState, useRef, useEffect } from 'react';

const CONFETTI_COLORS = ['#f59e0b', '#ec4899', '#8b5cf6', '#10b981', '#3b82f6', '#f97316'];
const FAIL_CONFETTI_COLORS = ['#ef4444', '#6b7280', '#991b1b', '#374151', '#b91c1c', '#4b5563'];
const CONFETTI_COUNT = 48;

interface ConfettiPiece {
  id: number;
  x: number;
  color: string;
  delay: number;
  size: number;
  rotation: number;
  shape: 'rect' | 'circle';
}

function generateConfetti(colors: string[]): ConfettiPiece[] {
  return Array.from({ length: CONFETTI_COUNT }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    color: colors[i % colors.length],
    delay: Math.random() * 0.6,
    size: 6 + Math.random() * 8,
    rotation: Math.random() * 360,
    shape: Math.random() > 0.5 ? 'rect' : 'circle',
  }));
}

export interface RewardResult {
  icon: string;
  title: string;
  lines: string[];
  onConfirm: () => void;
  failed?: boolean;
}

interface RewardCelebrationModalProps {
  result: RewardResult;
  onClose: () => void;
}

export function RewardCelebrationModal({ result, onClose }: RewardCelebrationModalProps) {
  const [pieces] = useState<ConfettiPiece[]>(() => generateConfetti(result.failed ? FAIL_CONFETTI_COLORS : CONFETTI_COLORS));
  const [visible, setVisible] = useState(false);
  const confirmRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const t = requestAnimationFrame(() => setVisible(true));
    confirmRef.current?.focus();
    return () => cancelAnimationFrame(t);
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'z' || e.key === 'Z') {
        e.preventDefault();
        result.onConfirm();
        onClose();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [result, onClose]);

  const handleConfirm = () => {
    result.onConfirm();
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{
        background: 'rgba(0,0,0,0.75)',
        opacity: visible ? 1 : 0,
        transition: 'opacity 0.2s',
      }}
      onClick={handleConfirm}
    >
      {/* Confetti */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {pieces.map(p => (
          <div
            key={p.id}
            style={{
              position: 'absolute',
              left: `${p.x}%`,
              top: visible ? '110%' : '-10%',
              width: p.shape === 'rect' ? p.size : p.size,
              height: p.shape === 'rect' ? p.size * 0.5 : p.size,
              borderRadius: p.shape === 'circle' ? '50%' : '2px',
              background: p.color,
              transform: `rotate(${p.rotation}deg)`,
              transition: `top ${1.2 + p.delay}s cubic-bezier(0.25, 0.46, 0.45, 0.94) ${p.delay}s`,
              opacity: 0.9,
            }}
          />
        ))}
      </div>

      {/* Modal card */}
      <div
        className="relative z-10 bg-theme-raised border border-border-strong rounded-2xl p-8 max-w-sm w-full mx-4 text-center shadow-2xl"
        style={{
          transform: visible ? 'scale(1) translateY(0)' : 'scale(0.85) translateY(20px)',
          transition: 'transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
        }}
        onClick={e => e.stopPropagation()}
      >
        <div
          className="text-6xl mb-4"
          style={{
            transform: visible ? 'scale(1) rotate(0deg)' : 'scale(0) rotate(-30deg)',
            transition: 'transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) 0.1s',
            display: 'inline-block',
          }}
        >
          {result.icon}
        </div>

        <h2 className={`font-pixel text-sm mb-4 ${result.failed ? 'text-red-400' : 'text-accent'}`}>{result.title}</h2>

        <div className="flex flex-col gap-1 mb-6">
          {result.lines.map((line, i) => (
            <p key={i} className={i === 0 ? 'text-text-bright text-sm font-semibold' : 'text-text-muted text-xs'}>
              {line}
            </p>
          ))}
        </div>

        <button
          ref={confirmRef}
          onClick={handleConfirm}
          className={`w-full font-bold py-3 px-6 rounded-xl transition-colors text-sm ${result.failed ? 'bg-gray-600 hover:bg-gray-500 text-white' : 'bg-yellow-500 hover:bg-yellow-400 text-black'}`}
        >
          {result.failed ? 'Continue...' : 'Continue →'}
        </button>
      </div>
    </div>
  );
}
