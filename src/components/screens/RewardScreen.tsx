import { useState, useEffect, type Dispatch } from 'react';
import type { GameState, RewardOption } from '../../types';
import type { GameAction } from '../../reducers/gameReducer';
import { Button } from '../ui/Button';
import { GoldDisplay } from '../ui/GoldDisplay';
import { CinematicsModal } from '../Reward/CinematicsModal';
import { RewardOptionCard } from '../Reward/RewardOption';

interface RewardScreenProps {
  gameState: GameState;
  dispatch: Dispatch<GameAction>;
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
    <div className="min-h-screen bg-theme-base flex flex-col items-center justify-center p-4 lg:p-6">
      <div className="w-full max-w-lg">
        {/* Header */}
        <div className="text-center mb-6 lg:mb-8">
          <div className="text-4xl lg:text-6xl mb-3 lg:mb-4">🏆</div>
          <h1 className="font-pixel text-accent text-base lg:text-lg mb-2">Victory!</h1>
          <p className="text-text-muted text-sm">Choose your reward</p>
        </div>

        {/* Player stats */}
        <div className="flex justify-center mb-6">
          <GoldDisplay gold={player.gold} />
        </div>

        {/* Reward options */}
        <div className="flex flex-col gap-4">
          {pendingRewards.map((reward, i) => (
            <RewardOptionCard
              key={i}
              reward={reward}
              playerStats={player.stats}
              onClick={() => handleChoose(reward)}
            />
          ))}
        </div>

        {/* Skip */}
        <div className="mt-6 text-center">
          <Button variant="ghost" onClick={() => dispatch({ type: 'GO_TO_SHOP' })}>
            Skip rewards → Shop
          </Button>
        </div>
      </div>

      <CinematicsModal cinematicUrls={cinematicUrls} slideIndex={slideIndex} visible={visible} handleCinematicClose={handleCinematicClose} />
    </div>
  );
}
