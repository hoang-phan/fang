import { useState, useEffect, type Dispatch } from 'react';
import type { GameState, RewardOption } from '../../types';
import type { GameAction } from '../../reducers/gameReducer';
import { Button } from '../ui/Button';
import { GoldDisplay } from '../ui/GoldDisplay';
import { getTypeIcon, moveDamageRange } from '../../utils/damage';

interface RewardScreenProps {
  gameState: GameState;
  dispatch: Dispatch<GameAction>;
}

function rewardIcon(reward: RewardOption): string {
  if (reward.type === 'cinematic') return '🎬';
  if (reward.type === 'loot') return '💰';
  if (reward.move) return getTypeIcon(reward.move.type);
  return '⬆️';
}

function rewardBg(reward: RewardOption): string {
  if (reward.type === 'cinematic') return 'border-pink-600 bg-pink-900/20 hover:bg-pink-900/40';
  if (reward.type === 'loot') return 'border-reward-loot bg-reward-loot-bg hover:bg-reward-loot-hover';
  if (reward.type === 'learn_new') return 'border-purple-600 bg-purple-900/20 hover:bg-purple-900/40';
  return 'border-blue-600 bg-blue-900/20 hover:bg-blue-900/40';
}

export function RewardScreen({ gameState, dispatch }: RewardScreenProps) {
  const { pendingRewards, player } = gameState;
  const [cinematicUrls, setCinematicUrls] = useState<string[]>([]);
  const [pendingCinematicReward, setPendingCinematicReward] = useState<RewardOption | null>(null);
  const [slideIndex, setSlideIndex] = useState(0);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    if (cinematicUrls.length <= 1) return;
    const cycle = setInterval(() => {
      setVisible(false);
      setTimeout(() => {
        setSlideIndex(i => (i + 1) % cinematicUrls.length);
        setVisible(true);
      }, 500);
    }, 5000);
    return () => clearInterval(cycle);
  }, [cinematicUrls]);

  const handleChoose = (reward: RewardOption) => {
    if (reward.type === 'cinematic' && reward.cinematicUrl) {
      const urls = reward.cinematicUrl.split(',').map(u => u.trim()).filter(Boolean);
      setCinematicUrls(urls);
      setSlideIndex(0);
      setVisible(true);
      setPendingCinematicReward(reward);
      return;
    }
    dispatch({ type: 'CHOOSE_REWARD', reward });
  };

  const handleCinematicClose = () => {
    setCinematicUrls([]);
    if (pendingCinematicReward) {
      dispatch({ type: 'CHOOSE_REWARD', reward: pendingCinematicReward });
    }
    setPendingCinematicReward(null);
  };

  return (
    <div className="min-h-screen bg-theme-base flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-lg">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="text-6xl mb-4">🏆</div>
          <h1 className="font-pixel text-accent text-lg mb-2">Victory!</h1>
          <p className="text-text-muted text-sm">Choose your reward</p>
        </div>

        {/* Player stats */}
        <div className="flex justify-center mb-6">
          <GoldDisplay gold={player.gold} />
        </div>

        {/* Reward options */}
        <div className="flex flex-col gap-4">
          {pendingRewards.map((reward, i) => (
            <button
              key={i}
              onClick={() => handleChoose(reward)}
              className={`
                w-full text-left rounded-xl border p-5 transition-all duration-150 cursor-pointer
                ${rewardBg(reward)}
              `}
            >
              <div className="flex items-start gap-4">
                <span className="text-4xl">{rewardIcon(reward)}</span>
                <div className="flex-1">
                  <h3 className="font-bold text-text-bright mb-1">{reward.label}</h3>
                  <p className="text-sm text-text-muted">{reward.description}</p>
                  {reward.move && (() => {
                    const move = reward.move!;
                    const statBonuses = player.stats;
                    const cur = moveDamageRange(move, statBonuses);
                    const nextMove = move.level < move.maxLevel
                      ? { ...move, level: move.level + 1 }
                      : null;
                    const next = nextMove ? moveDamageRange(nextMove, statBonuses) : null;
                    const fmtRange = (r: { min: number; max: number }) =>
                      r.min === r.max ? `${r.min}` : `${r.min}–${r.max}`;
                    return (
                      <div className="mt-2 flex flex-wrap gap-3 text-xs">
                        <span className="text-blue-400">{move.mpCost} MP</span>
                        {cur && (
                          move.baseDamage > 0
                            ? <span className="text-orange-400">{fmtRange(cur)} dmg</span>
                            : <span className="text-green-400">heals {fmtRange({ min: Math.abs(cur.max), max: Math.abs(cur.min) })}</span>
                        )}
                        {next && cur && reward.type === 'upskill' && (
                          move.baseDamage > 0
                            ? <span className="text-accent">→ {fmtRange(next)} dmg</span>
                            : <span className="text-accent">→ heals {fmtRange({ min: Math.abs(next.max), max: Math.abs(next.min) })}</span>
                        )}
                        <span className="text-text-faint">Lv{move.level}{reward.type === 'upskill' ? `→${move.level + 1}` : ''} / {move.maxLevel}</span>
                      </div>
                    );
                  })()}
                </div>
                <span className="text-text-muted text-xl self-center">▶</span>
              </div>
            </button>
          ))}
        </div>

        {/* Skip */}
        <div className="mt-6 text-center">
          <Button variant="ghost" onClick={() => dispatch({ type: 'GO_TO_SHOP' })}>
            Skip rewards → Shop
          </Button>
        </div>
      </div>

      {/* Cinematic modal */}
      {cinematicUrls.length > 0 && (
        <div className="fixed inset-0 flex flex-col items-center justify-center z-50 p-4" style={{ background: 'var(--overlay-dark)' }}>
          <div className="w-full flex flex-col items-center justify-center">
            <img
              src={cinematicUrls[slideIndex]}
              alt="Level cinematic"
              className="w-5/6 rounded-lg max-h-[80vh] object-contain"
              style={{ opacity: visible ? 1 : 0, transition: 'opacity 0.5s ease-in-out' }}
            />
            <div className="mt-6 text-center">
              <Button onClick={handleCinematicClose}>
                Continue → Shop
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
