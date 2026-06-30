import { useState, useCallback, type Dispatch } from 'react';
import type { GameState, RewardOption, EquipmentItem, OpponentCinematic, Conversation, RelationshipProgress } from '../../types';
import type { GameAction } from '../../reducers/gameReducer';
import { useRewardMenuKeys } from '../../hooks/useKeyboardShortcuts';
import { RewardMainMenu } from './RewardMainMenu';
import { RewardSkillsMenu } from './RewardSkillsMenu';
import { RewardInteractionsMenu } from './RewardInteractionsMenu';
import { RewardGiftsMenu } from './RewardGiftsMenu';
import { RewardCinematicsMenu } from './RewardCinematicsMenu';
import { RewardReplaceSkillMenu } from './RewardReplaceSkillMenu';
import type { RewardResult } from '../Reward/RewardCelebrationModal';

type MenuView = 'main' | 'skills' | 'interactions' | 'gifts' | 'cinematics' | 'replace_skill';

interface RewardMenuProps {
  gameState: GameState;
  dispatch: Dispatch<GameAction>;
  shopItems?: EquipmentItem[];
  relProgress: RelationshipProgress;
  onOpenConversation: (conversations: Conversation[], onComplete: () => void, onFail?: () => void) => void;
  onRewardResult: (result: RewardResult) => void;
}

export function RewardMenu({ gameState, dispatch, shopItems, relProgress, onOpenConversation, onRewardResult }: RewardMenuProps) {
  const { pendingRewards, player, lastDefeatedOpponent } = gameState;
  const [menuView, setMenuView] = useState<MenuView>('main');
  const [pendingLearnReward, setPendingLearnReward] = useState<RewardOption | null>(null);
  const [focusedIndex, setFocusedIndex] = useState(0);

  const navigateTo = useCallback((view: MenuView) => {
    setMenuView(view);
    setFocusedIndex(0);
  }, []);

  const opponentId = lastDefeatedOpponent?.id ?? '';
  const skillRewards = pendingRewards.filter(r => r.type === 'learn_new' || r.type === 'upskill');
  const lootReward = pendingRewards.find(r => r.type === 'loot');
  const unlockedCinematics = (lastDefeatedOpponent?.cinematics ?? []).filter(
    c => relProgress.level >= c.level - 1
  );
  const availableGifts = lastDefeatedOpponent?.gifts ?? [];
  const isSkillsFull = player.moves.every(m => m !== null) && player.learnedPool.length >= 2;

  // --- Action handlers ---

  const handleChooseSkill = (reward: RewardOption) => {
    const isNew = reward.type === 'learn_new';
    const moveName = reward.move?.name ?? reward.label;
    const moveIcon = reward.move?.icon ?? '⚔️';

    if (isNew && isSkillsFull) {
      setPendingLearnReward(reward);
      navigateTo('replace_skill');
      return;
    }

    onRewardResult({
      icon: moveIcon,
      title: isNew ? 'New Skill Learned!' : 'Skill Upgraded!',
      lines: [
        isNew ? `You learned ${moveName}!` : `${moveName} leveled up to Lv${(reward.move?.level ?? 1) + 1}!`,
        reward.description,
      ],
      onConfirm: () => dispatch({ type: 'CHOOSE_REWARD', reward, shopItems }),
    });
  };

  const handleReplaceSkill = (replacePoolMoveId: string) => {
    if (!pendingLearnReward) return;
    const moveName = pendingLearnReward.move?.name ?? pendingLearnReward.label;
    const moveIcon = pendingLearnReward.move?.icon ?? '⚔️';
    const replacedMove = player.learnedPool.find(m => m.id === replacePoolMoveId);
    onRewardResult({
      icon: moveIcon,
      title: 'New Skill Learned!',
      lines: [
        `You learned ${moveName}!`,
        replacedMove ? `Replaced: ${replacedMove.name}` : pendingLearnReward.description,
      ],
      onConfirm: () => dispatch({ type: 'CHOOSE_REWARD', reward: pendingLearnReward, shopItems, replacePoolMoveId }),
    });
    setPendingLearnReward(null);
  };

  const handleLoot = () => {
    if (!lootReward) return;
    const lines: string[] = [lootReward.description];
    if (lootReward.droppedItem) {
      lines.push(`Found: ${lootReward.droppedItem.icon} ${lootReward.droppedItem.name}!`);
    }
    onRewardResult({
      icon: '💰',
      title: 'Loot Claimed!',
      lines,
      onConfirm: () => dispatch({ type: 'CHOOSE_REWARD', reward: lootReward, shopItems }),
    });
  };

  const handleChat = () => {
    const conversations = lastDefeatedOpponent?.conversations ?? [];
    const doDispatch = () => dispatch({ type: 'INTERACTION_CHAT', opponentId, shopItems });
    const showResult = () => onRewardResult({
      icon: '💬',
      title: 'Had a Chat!',
      lines: [`You talked with ${lastDefeatedOpponent?.name ?? 'them'}.`, '+15 Relationship XP'],
      onConfirm: doDispatch,
    });

    if (conversations.length > 0) {
      const picked = conversations[Math.floor(Math.random() * conversations.length)];
      onOpenConversation([picked], showResult);
    } else {
      showResult();
    }
  };

  const handleGift = (giftId: number) => {
    const gift = availableGifts.find(g => g.id === giftId);
    if (!gift) return;
    const doDispatch = () => dispatch({ type: 'INTERACTION_GIFT', opponentId, giftId, shopItems });
    const showResult = () => onRewardResult({
      icon: '🎁',
      title: 'Gift Given!',
      lines: [
        `You gave ${gift.name} to ${lastDefeatedOpponent?.name ?? 'them'}.`,
        `-${gift.gold}g  ·  +${gift.exp} Relationship XP`,
      ],
      onConfirm: doDispatch,
    });

    if (gift.conversations && gift.conversations.length > 0) {
      onOpenConversation(gift.conversations, showResult);
    } else {
      showResult();
    }
  };

  const handleWatchCinematic = (cinematic: OpponentCinematic) => {
    const conversations = cinematic.conversations ?? [];
    const relationshipGain = cinematic.relationshipGain ?? 0;
    const doDispatch = (gain: number) => dispatch({ type: 'INTERACTION_CINEMATIC', opponentId, relationshipGain: gain, shopItems });
    const showResult = () => onRewardResult({
      icon: '💕',
      title: 'Event is successful!',
      lines: [
        cinematic.description ?? `Scene ${cinematic.level}`,
        relationshipGain > 0 ? `+${relationshipGain} Relationship XP` : 'Bond deepened.',
      ],
      onConfirm: () => doDispatch(relationshipGain),
    });
    const showFail = () => onRewardResult({
      icon: '💔',
      title: 'You failed...',
      lines: ['The moment slipped away.', 'No relationship XP gained.'],
      onConfirm: () => doDispatch(0),
      failed: true,
    });

    if (conversations.length > 0) {
      onOpenConversation(conversations, showResult, showFail);
    } else {
      showResult();
    }
  };

  // --- Keyboard wiring ---

  const backAction: (() => void) | null = (() => {
    if (menuView === 'main') return null;
    if (menuView === 'gifts' || menuView === 'cinematics') return () => navigateTo('interactions');
    if (menuView === 'replace_skill') return () => { setPendingLearnReward(null); navigateTo('skills'); };
    return () => navigateTo('main');
  })();

  const menuActions: (() => void)[] = (() => {
    if (menuView === 'main') return [
      ...(skillRewards.length > 0 ? [() => navigateTo('skills')] : []),
      () => navigateTo('interactions'),
      ...(lootReward ? [handleLoot] : []),
      () => dispatch({ type: 'GO_TO_SHOP' }),
    ];
    if (menuView === 'skills') return skillRewards.map(r => () => handleChooseSkill(r));
    if (menuView === 'interactions') return [
      handleChat,
      () => navigateTo('gifts'),
      ...(unlockedCinematics.length > 0 ? [() => navigateTo('cinematics')] : []),
    ];
    if (menuView === 'gifts') return availableGifts
      .filter(g => player.gold >= g.gold)
      .map(g => () => handleGift(g.id));
    if (menuView === 'cinematics') return unlockedCinematics.map(c => () => handleWatchCinematic(c));
    if (menuView === 'replace_skill') return player.learnedPool.map(m => () => handleReplaceSkill(m.id));
    return [];
  })();

  const handleKeySelect = useCallback(() => {
    menuActions[focusedIndex]?.();
  }, [menuActions, focusedIndex]);



  useRewardMenuKeys({
    itemCount: menuActions.length,
    focusedIndex,
    onNavigate: setFocusedIndex,
    onSelect: handleKeySelect,
    onBack: backAction,
  });

  // --- Render ---

  return (
    <div className="w-full max-w-lg">
      {menuView !== 'main' && (
        <button
          onClick={backAction ?? undefined}
          className="mb-4 text-sm text-text-muted hover:text-text-bright flex items-center gap-1"
        >
          ← Back
        </button>
      )}

      {menuView === 'main' && (
        <RewardMainMenu
          skillRewards={skillRewards}
          lootReward={lootReward}
          focusedIndex={focusedIndex}
          onShowSkills={() => navigateTo('skills')}
          onShowInteractions={() => navigateTo('interactions')}
          onLoot={handleLoot}
          onSkip={() => dispatch({ type: 'GO_TO_SHOP' })}
        />
      )}

      {menuView === 'skills' && (
        <RewardSkillsMenu
          skillRewards={skillRewards}
          focusedIndex={focusedIndex}
          onChoose={handleChooseSkill}
        />
      )}

      {menuView === 'interactions' && (
        <RewardInteractionsMenu
          unlockedCinematicsCount={unlockedCinematics.length}
          focusedIndex={focusedIndex}
          onChat={handleChat}
          onShowGifts={() => navigateTo('gifts')}
          onShowCinematics={() => navigateTo('cinematics')}
        />
      )}

      {menuView === 'gifts' && (
        <RewardGiftsMenu
          gifts={availableGifts}
          playerGold={player.gold}
          focusedIndex={focusedIndex}
          onGift={handleGift}
        />
      )}

      {menuView === 'cinematics' && (
        <RewardCinematicsMenu
          cinematics={unlockedCinematics}
          focusedIndex={focusedIndex}
          onWatch={handleWatchCinematic}
        />
      )}

      {menuView === 'replace_skill' && pendingLearnReward && (
        <RewardReplaceSkillMenu
          pendingReward={pendingLearnReward}
          learnedPool={player.learnedPool}
          focusedIndex={focusedIndex}
          onReplace={handleReplaceSkill}
        />
      )}
    </div>
  );
}
