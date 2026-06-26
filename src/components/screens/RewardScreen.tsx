import { useState, useEffect, useCallback, type Dispatch } from 'react';
import type { GameState, RewardOption, EquipmentItem, OpponentCinematic, Conversation } from '../../types';
import type { GameAction } from '../../reducers/gameReducer';
import { GoldDisplay } from '../ui/GoldDisplay';
import { ConversationOverlay } from '../Reward/ConversationOverlay';
import { RewardOptionCard } from '../Reward/RewardOption';
import { MenuButton } from '../Reward/MenuButton';
import { RewardCelebrationModal, type RewardResult } from '../Reward/RewardCelebrationModal';
import { getRelationshipProgress, relXpToNextLevel } from '../../utils/xp';
import { useRewardMenuKeys } from '../../hooks/useKeyboardShortcuts';

interface RewardScreenProps {
  gameState: GameState;
  dispatch: Dispatch<GameAction>;
  shopItems?: EquipmentItem[];
}

type MenuView = 'main' | 'skills' | 'interactions' | 'gifts' | 'cinematics' | 'replace_skill';

export function RewardScreen({ gameState, dispatch, shopItems }: RewardScreenProps) {
  const { pendingRewards, player, lastDefeatedOpponent, relationshipProgress } = gameState;
  const [menuView, setMenuView] = useState<MenuView>('main');
  const [pendingLearnReward, setPendingLearnReward] = useState<RewardOption | null>(null);
  const [pendingConversation, setPendingConversation] = useState<Conversation[] | null>(null);
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);
  const [pendingFail, setPendingFail] = useState<(() => void) | null>(null);
  const [rewardResult, setRewardResult] = useState<RewardResult | null>(null);
  const [focusedIndex, setFocusedIndex] = useState(0);

  const opponentId = lastDefeatedOpponent?.id ?? '';
  const relProgress = getRelationshipProgress(relationshipProgress, opponentId);
  const relXpNeeded = relXpToNextLevel(relProgress.level);

  const skillRewards = pendingRewards.filter(r => r.type === 'learn_new' || r.type === 'upskill');
  const lootReward = pendingRewards.find(r => r.type === 'loot');

  const unlockedCinematics = (lastDefeatedOpponent?.cinematics ?? []).filter(
    c => relProgress.level >= c.level - 1
  );

  const availableGifts = lastDefeatedOpponent?.gifts ?? [];

  const isSkillsFull = player.moves.every(m => m !== null) && player.learnedPool.length >= 2;

  const handleChooseSkill = (reward: RewardOption) => {
    const isNew = reward.type === 'learn_new';
    const moveName = reward.move?.name ?? reward.label;
    const moveIcon = reward.move?.icon ?? '⚔️';

    if (isNew && isSkillsFull) {
      setPendingLearnReward(reward);
      setMenuView('replace_skill');
      return;
    }

    setRewardResult({
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
    setRewardResult({
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
    setRewardResult({
      icon: '💰',
      title: 'Loot Claimed!',
      lines,
      onConfirm: () => dispatch({ type: 'CHOOSE_REWARD', reward: lootReward, shopItems }),
    });
  };

  const handleChat = () => {
    const conversations = lastDefeatedOpponent?.conversations ?? [];
    const doDispatch = () => dispatch({ type: 'INTERACTION_CHAT', opponentId, shopItems });
    const showResult = () => setRewardResult({
      icon: '💬',
      title: 'Had a Chat!',
      lines: [`You talked with ${lastDefeatedOpponent?.name ?? 'them'}.`, '+15 Relationship XP'],
      onConfirm: doDispatch,
    });

    if (conversations.length > 0) {
      const picked = conversations[Math.floor(Math.random() * conversations.length)];
      setPendingConversation([picked]);
      setPendingAction(() => showResult);
    } else {
      showResult();
    }
  };

  const handleGift = (giftId: number) => {
    const gift = availableGifts.find(g => g.id === giftId);
    if (!gift) return;
    const doDispatch = () => dispatch({ type: 'INTERACTION_GIFT', opponentId, giftId, shopItems });
    const showResult = () => setRewardResult({
      icon: '🎁',
      title: 'Gift Given!',
      lines: [
        `You gave ${gift.name} to ${lastDefeatedOpponent?.name ?? 'them'}.`,
        `-${gift.gold}g  ·  +${gift.exp} Relationship XP`,
      ],
      onConfirm: doDispatch,
    });

    if (gift.conversations && gift.conversations.length > 0) {
      setPendingConversation(gift.conversations);
      setPendingAction(() => showResult);
    } else {
      showResult();
    }
  };

  const handleWatchCinematic = (cinematic: OpponentCinematic) => {
    const conversations = cinematic.conversations ?? [];
    const relationshipGain = cinematic.relationshipGain ?? 0;
    const doDispatch = (gain: number) => dispatch({ type: 'INTERACTION_CINEMATIC', opponentId, relationshipGain: gain, shopItems });
    const showResult = () => setRewardResult({
      icon: '💕',
      title: 'Event is successful!',
      lines: [
        cinematic.description ?? `Scene ${cinematic.level}`,
        relationshipGain > 0 ? `+${relationshipGain} Relationship XP` : 'Bond deepened.',
      ],
      onConfirm: () => doDispatch(relationshipGain),
    });
    const showFail = () => setRewardResult({
      icon: '💔',
      title: 'You failed...',
      lines: ['The moment slipped away.', 'No relationship XP gained.'],
      onConfirm: () => doDispatch(0),
      failed: true,
    });

    if (conversations.length > 0) {
      setPendingConversation(conversations);
      setPendingAction(() => showResult);
      setPendingFail(() => showFail);
    } else {
      showResult();
    }
  };

  const handleConversationComplete = () => {
    const action = pendingAction;
    setPendingConversation(null);
    setPendingAction(null);
    setPendingFail(null);
    action?.();
  };

  const handleConversationFail = () => {
    const fail = pendingFail;
    setPendingConversation(null);
    setPendingAction(null);
    setPendingFail(null);
    fail?.();
  };

  // Keyboard navigation — build a flat list of selectable actions for the current view
  const menuActions: (() => void)[] = (() => {
    if (rewardResult || pendingConversation) return [];
    if (menuView === 'main') return [
      ...(skillRewards.length > 0 ? [() => setMenuView('skills')] : []),
      () => setMenuView('interactions'),
      ...(lootReward ? [handleLoot] : []),
      () => dispatch({ type: 'GO_TO_SHOP' }),
    ];
    if (menuView === 'skills') return skillRewards.map(r => () => handleChooseSkill(r));
    if (menuView === 'interactions') return [
      handleChat,
      () => setMenuView('gifts'),
      ...(unlockedCinematics.length > 0 ? [() => setMenuView('cinematics')] : []),
    ];
    if (menuView === 'gifts') return availableGifts
      .filter(g => player.gold >= g.gold)
      .map(g => () => handleGift(g.id));
    if (menuView === 'cinematics') return unlockedCinematics.map(c => () => handleWatchCinematic(c));
    if (menuView === 'replace_skill') return player.learnedPool.map(m => () => handleReplaceSkill(m.id));
    return [];
  })();

  const backAction: (() => void) | null = (() => {
    if (menuView === 'main') return null;
    if (menuView === 'gifts' || menuView === 'cinematics') return () => setMenuView('interactions');
    if (menuView === 'replace_skill') return () => { setPendingLearnReward(null); setMenuView('skills'); };
    return () => setMenuView('main');
  })();

  const handleKeySelect = useCallback(() => {
    menuActions[focusedIndex]?.();
  }, [menuActions, focusedIndex]);

  useEffect(() => { setFocusedIndex(0); }, [menuView]);

  useRewardMenuKeys({
    itemCount: menuActions.length,
    focusedIndex,
    onNavigate: setFocusedIndex,
    onSelect: handleKeySelect,
    onBack: backAction,
  });

  return (
    <div className="min-h-screen bg-theme-base flex flex-col items-center justify-center p-4 lg:p-6">
      <div className="w-full max-w-lg">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="text-4xl lg:text-6xl mb-3">🏆</div>
          <h1 className="font-pixel text-accent text-base lg:text-lg mb-2">Victory!</h1>
          {lastDefeatedOpponent && (
            <p className="text-text-muted text-sm">{lastDefeatedOpponent.name}</p>
          )}
        </div>

        {/* Player stats + relationship */}
        <div className="flex items-center justify-between mb-6 gap-4">
          <GoldDisplay gold={player.gold} />
          {lastDefeatedOpponent && (
            <div className="flex flex-col items-end gap-1 min-w-0">
              <span className="text-xs text-text-faint">Relationship Lv {relProgress.level}</span>
              <div className="flex items-center gap-2">
                <div className="w-28 h-2 bg-theme-surface rounded-full overflow-hidden">
                  <div
                    className="h-full bg-pink-500 rounded-full transition-all"
                    style={{ width: `${(relProgress.xp / relXpNeeded) * 100}%` }}
                  />
                </div>
                <span className="text-xs text-text-faint whitespace-nowrap">{relProgress.xp}/{relXpNeeded}</span>
              </div>
            </div>
          )}
        </div>

        {/* Back button for submenus */}
        {menuView !== 'main' && (
          <button
            onClick={() => {
              if (menuView === 'gifts' || menuView === 'cinematics') setMenuView('interactions');
              else if (menuView === 'replace_skill') { setPendingLearnReward(null); setMenuView('skills'); }
              else setMenuView('main');
            }}
            className="mb-4 text-sm text-text-muted hover:text-text-bright flex items-center gap-1"
          >
            ← Back
          </button>
        )}

        {/* Main menu */}
        {menuView === 'main' && (() => {
          let idx = 0;
          const skillIdx = skillRewards.length > 0 ? idx++ : -1;
          const interactIdx = idx++;
          const lootIdx = lootReward ? idx++ : -1;
          const skipIdx = idx++;
          return (
            <div className="flex flex-col gap-3">
              <MenuButton
                icon="⚔️"
                label="Skills"
                description={skillRewards.length > 0 ? `${skillRewards.length} option${skillRewards.length > 1 ? 's' : ''} available` : 'No skills available'}
                disabled={skillRewards.length === 0}
                focused={focusedIndex === skillIdx && skillIdx !== -1}
                onClick={() => setMenuView('skills')}
              />
              <MenuButton
                icon="💬"
                label="Interactions"
                description="Chat, give gifts, or events"
                focused={focusedIndex === interactIdx}
                onClick={() => setMenuView('interactions')}
              />
              <MenuButton
                icon="💰"
                label="Loot"
                description={lootReward ? 'Gold + possible item drop' : 'No loot available'}
                disabled={!lootReward}
                focused={focusedIndex === lootIdx && lootIdx !== -1}
                onClick={handleLoot}
                accent="gold"
              />
              <button
                onClick={() => dispatch({ type: 'GO_TO_SHOP' })}
                className={`text-sm text-center mt-2 py-2 transition-colors ${focusedIndex === skipIdx ? 'text-text-bright underline' : 'text-text-faint hover:text-text-muted'}`}
              >
                Skip → Shop
              </button>
            </div>
          );
        })()}

        {/* Skills submenu */}
        {menuView === 'skills' && (
          <div className="flex flex-col gap-4">
            {skillRewards.map((reward, i) => (
              <RewardOptionCard
                key={i}
                reward={reward}
                focused={focusedIndex === i}
                onClick={() => handleChooseSkill(reward)}
              />
            ))}
          </div>
        )}

        {/* Interactions submenu */}
        {menuView === 'interactions' && (
          <div className="flex flex-col gap-3">
            <MenuButton
              icon="💬"
              label="Chat"
              description="Have a conversation, get closer"
              focused={focusedIndex === 0}
              onClick={handleChat}
              accent="pink"
            />
            <MenuButton
              icon="🎁"
              label="Gift"
              description="Give a gift to deepen your bond"
              focused={focusedIndex === 1}
              onClick={() => setMenuView('gifts')}
              accent="pink"
            />
            <MenuButton
              icon="💕"
              label="Events"
              description={unlockedCinematics.length > 0 ? `${unlockedCinematics.length} unlocked` : 'None unlocked yet'}
              disabled={unlockedCinematics.length === 0}
              focused={focusedIndex === 2 && unlockedCinematics.length > 0}
              onClick={() => setMenuView('cinematics')}
              accent="pink"
            />
          </div>
        )}

        {/* Gifts submenu */}
        {menuView === 'gifts' && (
          <div className="flex flex-col gap-3">
            {availableGifts.length === 0 && (
              <p className="text-text-muted text-sm text-center py-4">No gifts available.</p>
            )}
            {availableGifts.map((gift, i) => {
              const canAfford = player.gold >= gift.gold;
              return (
                <MenuButton
                  key={gift.id}
                  icon="🎁"
                  label={gift.name}
                  description={`${gift.gold}g · deepens your bond`}
                  disabled={!canAfford}
                  disabledReason={!canAfford ? 'Not enough gold' : undefined}
                  focused={focusedIndex === i && canAfford}
                  onClick={() => handleGift(gift.id)}
                  accent="pink"
                />
              );
            })}
          </div>
        )}

        {/* Events submenu */}
        {menuView === 'cinematics' && (
          <div className="flex flex-col gap-3">
            {unlockedCinematics.map((c, i) => (
              <MenuButton
                key={c.level}
                icon="💕"
                label={`Scene ${i + 1}`}
                description={c.description ?? `Relationship level ${c.level - 1}`}
                focused={focusedIndex === i}
                onClick={() => handleWatchCinematic(c)}
                accent="pink"
              />
            ))}
          </div>
        )}

        {/* Replace backup skill submenu */}
        {menuView === 'replace_skill' && pendingLearnReward && (
          <div className="flex flex-col gap-3">
            <p className="text-sm text-text-muted mb-1">
              All skill slots are full. Choose a backup skill to replace with{' '}
              <span className="text-text-bright font-semibold">{pendingLearnReward.move?.name ?? pendingLearnReward.label}</span>:
            </p>
            {player.learnedPool.map((move, i) => (
              <MenuButton
                key={move.id}
                icon={move.icon ?? '⚔️'}
                label={move.name}
                description={`Lv${move.level} · ${move.mpCost} MP`}
                focused={focusedIndex === i}
                onClick={() => handleReplaceSkill(move.id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Conversation overlay (chat / gift / cinematics) */}
      {pendingConversation && (
        <ConversationOverlay
          conversations={pendingConversation}
          opponentName={lastDefeatedOpponent?.name ?? ''}
          heroName={player.name}
          opponentSpriteUrl={lastDefeatedOpponent?.avatars?.[0]}
          onComplete={handleConversationComplete}
          onFail={pendingFail ? handleConversationFail : undefined}
        />
      )}

      {/* Reward result celebration modal */}
      {rewardResult && (
        <RewardCelebrationModal
          result={rewardResult}
          onClose={() => setRewardResult(null)}
        />
      )}
    </div>
  );
}
