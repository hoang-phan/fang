import { useState, type Dispatch } from 'react';
import type { GameState, EquipmentItem, Conversation } from '../../types';
import type { GameAction } from '../../reducers/gameReducer';
import { getRelationshipProgress, relXpToNextLevel } from '../../utils/xp';
import { RewardHeader } from '../Reward/RewardHeader';
import { RewardRelationshipBar } from '../Reward/RewardRelationshipBar';
import { RewardMenu } from '../RewardMenu';
import { ConversationOverlay } from '../ConversationOverlay';
import { RewardCelebrationModal, type RewardResult } from '../Reward/RewardCelebrationModal';

interface RewardScreenProps {
  gameState: GameState;
  dispatch: Dispatch<GameAction>;
  shopItems?: EquipmentItem[];
}

interface PendingConversation {
  conversations: Conversation[];
  onComplete: () => void;
  onFail?: () => void;
}

export function RewardScreen({ gameState, dispatch, shopItems }: RewardScreenProps) {
  const [pendingConversation, setPendingConversation] = useState<PendingConversation | null>(null);
  const [rewardResult, setRewardResult] = useState<RewardResult | null>(null);

  const { player, lastDefeatedOpponent, relationshipProgress } = gameState;
  const opponentId = lastDefeatedOpponent?.id ?? '';
  const relProgress = getRelationshipProgress(relationshipProgress, opponentId);
  const relXpNeeded = relXpToNextLevel(relProgress.level);

  const handleOpenConversation = (conversations: Conversation[], onComplete: () => void, onFail?: () => void) => {
    setPendingConversation({ conversations, onComplete, onFail });
  };

  const handleConversationComplete = () => {
    const action = pendingConversation?.onComplete;
    setPendingConversation(null);
    action?.();
  };

  const handleConversationFail = () => {
    const fail = pendingConversation?.onFail;
    setPendingConversation(null);
    fail?.();
  };

  return (
    <div className="min-h-screen bg-theme-base flex flex-col items-center justify-center p-4 lg:p-6">
      <div className="w-full max-w-lg">
        <RewardHeader opponentName={lastDefeatedOpponent?.name} />
        <RewardRelationshipBar
          gold={player.gold}
          opponentName={lastDefeatedOpponent?.name}
          relProgress={relProgress}
          relXpNeeded={relXpNeeded}
        />
        <RewardMenu
          gameState={gameState}
          dispatch={dispatch}
          shopItems={shopItems}
          relProgress={relProgress}
          onOpenConversation={handleOpenConversation}
          onRewardResult={setRewardResult}
        />
      </div>

      {pendingConversation && (
        <ConversationOverlay
          conversations={pendingConversation.conversations}
          opponentName={lastDefeatedOpponent?.name ?? ''}
          heroName={player.name}
          onComplete={handleConversationComplete}
          onFail={pendingConversation.onFail ? handleConversationFail : undefined}
        />
      )}

      {rewardResult && (
        <RewardCelebrationModal
          result={rewardResult}
          onClose={() => setRewardResult(null)}
        />
      )}
    </div>
  );
}
