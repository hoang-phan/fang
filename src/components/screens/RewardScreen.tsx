import { useState, useRef, useEffect, useCallback, type Dispatch } from 'react';
import type { GameState, RewardOption, EquipmentItem, OpponentCinematic, Conversation } from '../../types';
import type { GameAction } from '../../reducers/gameReducer';
import { GoldDisplay } from '../ui/GoldDisplay';
import { ConversationOverlay } from '../Reward/ConversationOverlay';
import { RewardOptionCard } from '../Reward/RewardOption';
import { getRelationshipProgress, relXpToNextLevel } from '../../utils/xp';
import { useRewardMenuKeys } from '../../hooks/useKeyboardShortcuts';

interface RewardScreenProps {
  gameState: GameState;
  dispatch: Dispatch<GameAction>;
  shopItems?: EquipmentItem[];
}

type MenuView = 'main' | 'skills' | 'interactions' | 'gifts' | 'cinematics';

interface RewardResult {
  icon: string;
  title: string;
  lines: string[];
  onConfirm: () => void;
  failed?: boolean;
}

export function RewardScreen({ gameState, dispatch, shopItems }: RewardScreenProps) {
  const { pendingRewards, player, lastDefeatedOpponent, relationshipProgress } = gameState;
  const [menuView, setMenuView] = useState<MenuView>('main');
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

  const handleChooseSkill = (reward: RewardOption) => {
    const isNew = reward.type === 'learn_new';
    const moveName = reward.move?.name ?? reward.label;
    const moveIcon = reward.move?.icon ?? '⚔️';
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
    return [];
  })();

  const backAction: (() => void) | null = (() => {
    if (menuView === 'main') return null;
    if (menuView === 'gifts' || menuView === 'cinematics') return () => setMenuView('interactions');
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
            onClick={() => setMenuView(menuView === 'gifts' || menuView === 'cinematics' ? 'interactions' : 'main')}
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
      </div>

      {/* Conversation overlay (chat / gift / cinematics) */}
      {pendingConversation && (
        <ConversationOverlay
          conversations={pendingConversation}
          opponentName={lastDefeatedOpponent?.name ?? ''}
          heroName={player.name}
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

// ─── Reward Celebration Modal ──────────────────────────────────────────────────

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

interface RewardCelebrationModalProps {
  result: RewardResult;
  onClose: () => void;
}

function RewardCelebrationModal({ result, onClose }: RewardCelebrationModalProps) {
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

// ─── Menu Button ───────────────────────────────────────────────────────────────

interface MenuButtonProps {
  icon: string;
  label: string;
  description: string;
  disabled?: boolean;
  disabledReason?: string;
  focused?: boolean;
  onClick: () => void;
  accent?: 'gold' | 'pink';
}

function MenuButton({ icon, label, description, disabled, disabledReason, focused, onClick, accent }: MenuButtonProps) {
  const accentClass = accent === 'gold'
    ? 'border-yellow-600 bg-yellow-900/20 hover:bg-yellow-900/40'
    : accent === 'pink'
    ? 'border-pink-600 bg-pink-900/20 hover:bg-pink-900/40'
    : 'border-border-strong bg-theme-surface/60 hover:border-text-faint hover:bg-theme-surface';

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`
        w-full text-left rounded-xl border p-4 transition-all duration-150 flex items-center gap-4
        ${disabled ? 'opacity-40 cursor-not-allowed border-border-mid bg-theme-surface/30' : `cursor-pointer ${accentClass}`}
        ${focused && !disabled ? 'ring-2 ring-white/60 ring-offset-1 ring-offset-transparent' : ''}
      `}
    >
      <span className="text-3xl shrink-0">{icon}</span>
      <div className="flex-1 min-w-0">
        <div className="font-bold text-text-bright text-sm">{label}</div>
        <div className="text-xs text-text-muted mt-0.5">
          {disabled && disabledReason ? disabledReason : description}
        </div>
      </div>
      {!disabled && <span className={`text-lg shrink-0 ${focused ? 'text-white' : 'text-text-muted'}`}>▶</span>}
    </button>
  );
}
