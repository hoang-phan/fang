import { useState, type Dispatch } from 'react';
import type { GameState, RewardOption, EquipmentItem, OpponentCinematic, Conversation } from '../../types';
import type { GameAction } from '../../reducers/gameReducer';
import { GoldDisplay } from '../ui/GoldDisplay';
import { CinematicsModal } from '../Reward/CinematicsModal';
import { ConversationOverlay } from '../Reward/ConversationOverlay';
import { RewardOptionCard } from '../Reward/RewardOption';
import { getRelationshipProgress, relXpToNextLevel, getOpponentProgress } from '../../utils/xp';

interface RewardScreenProps {
  gameState: GameState;
  dispatch: Dispatch<GameAction>;
  shopItems?: EquipmentItem[];
}

type MenuView = 'main' | 'skills' | 'interactions' | 'gifts' | 'cinematics';

export function RewardScreen({ gameState, dispatch, shopItems }: RewardScreenProps) {
  const { pendingRewards, player, lastDefeatedOpponent, relationshipProgress, opponentProgress } = gameState;
  const [menuView, setMenuView] = useState<MenuView>('main');
  const [activeCinematic, setActiveCinematic] = useState<OpponentCinematic | null>(null);
  const [pendingConversation, setPendingConversation] = useState<Conversation[] | null>(null);
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);

  const opponentId = lastDefeatedOpponent?.id ?? '';
  const relProgress = getRelationshipProgress(relationshipProgress, opponentId);
  const relXpNeeded = relXpToNextLevel(relProgress.level);

  // Avatar URL — same logic as CombatantCard: level-indexed, 0-based
  const oppProgress = getOpponentProgress(opponentProgress, opponentId, lastDefeatedOpponent?.level ?? 1);
  const avatarIndex = Math.min(oppProgress.level, 5) - 1;
  const opponentAvatarUrl = lastDefeatedOpponent?.avatars?.[avatarIndex];

  const skillRewards = pendingRewards.filter(r => r.type === 'learn_new' || r.type === 'upskill');
  const lootReward = pendingRewards.find(r => r.type === 'loot');

  const unlockedCinematics = (lastDefeatedOpponent?.cinematics ?? []).filter(
    c => relProgress.level >= c.level - 1
  );

  const availableGifts = lastDefeatedOpponent?.gifts ?? [];

  const handleChooseSkill = (reward: RewardOption) => {
    dispatch({ type: 'CHOOSE_REWARD', reward, shopItems });
  };

  const handleLoot = () => {
    if (lootReward) dispatch({ type: 'CHOOSE_REWARD', reward: lootReward, shopItems });
  };

  const handleChat = () => {
    const conversations = lastDefeatedOpponent?.conversations ?? [];
    if (conversations.length > 0) {
      const picked = conversations[Math.floor(Math.random() * conversations.length)];
      setPendingConversation([picked]);
      setPendingAction(() => () => dispatch({ type: 'INTERACTION_CHAT', opponentId, shopItems }));
    } else {
      dispatch({ type: 'INTERACTION_CHAT', opponentId, shopItems });
    }
  };

  const handleGift = (giftId: number) => {
    const gift = availableGifts.find(g => g.id === giftId);
    if (gift?.conversations && gift.conversations.length > 0) {
      setPendingConversation(gift.conversations);
      setPendingAction(() => () => dispatch({ type: 'INTERACTION_GIFT', opponentId, giftId, shopItems }));
    } else {
      dispatch({ type: 'INTERACTION_GIFT', opponentId, giftId, shopItems });
    }
  };

  const handleWatchCinematic = (cinematic: OpponentCinematic) => {
    setActiveCinematic(cinematic);
  };

  const handleConversationComplete = () => {
    const action = pendingAction;
    setPendingConversation(null);
    setPendingAction(null);
    action?.();
  };

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
        {menuView === 'main' && (
          <div className="flex flex-col gap-3">
            <MenuButton
              icon="⚔️"
              label="Skills"
              description={skillRewards.length > 0 ? `${skillRewards.length} option${skillRewards.length > 1 ? 's' : ''} available` : 'No skills available'}
              disabled={skillRewards.length === 0}
              onClick={() => setMenuView('skills')}
            />
            <MenuButton
              icon="💬"
              label="Interactions"
              description="Chat, give gifts, or watch cinematics"
              onClick={() => setMenuView('interactions')}
            />
            <MenuButton
              icon="💰"
              label="Loot"
              description={lootReward ? lootReward.description : 'No loot available'}
              disabled={!lootReward}
              onClick={handleLoot}
              accent="gold"
            />
            <button
              onClick={() => dispatch({ type: 'GO_TO_SHOP' })}
              className="text-sm text-text-faint hover:text-text-muted text-center mt-2 py-2"
            >
              Skip → Shop
            </button>
          </div>
        )}

        {/* Skills submenu */}
        {menuView === 'skills' && (
          <div className="flex flex-col gap-4">
            {skillRewards.map((reward, i) => (
              <RewardOptionCard
                key={i}
                reward={reward}
                playerStats={player.stats}
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
              description="+15 relationship XP"
              onClick={handleChat}
              accent="pink"
            />
            <MenuButton
              icon="🎁"
              label="Gift"
              description="Give a gift to deepen your bond"
              onClick={() => setMenuView('gifts')}
              accent="pink"
            />
            <MenuButton
              icon="🎬"
              label="Watch Cinematics"
              description={unlockedCinematics.length > 0 ? `${unlockedCinematics.length} unlocked` : 'None unlocked yet'}
              disabled={unlockedCinematics.length === 0}
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
            {availableGifts.map((gift) => {
              const canAfford = player.gold >= gift.gold;
              return (
                <MenuButton
                  key={gift.id}
                  icon="🎁"
                  label={gift.name}
                  description={`${gift.gold}g → +${gift.exp} relationship XP`}
                  disabled={!canAfford}
                  disabledReason={!canAfford ? 'Not enough gold' : undefined}
                  onClick={() => handleGift(gift.id)}
                  accent="pink"
                />
              );
            })}
          </div>
        )}

        {/* Cinematics submenu */}
        {menuView === 'cinematics' && (
          <div className="flex flex-col gap-3">
            {unlockedCinematics.map((c, i) => (
              <MenuButton
                key={c.level}
                icon="🎬"
                label={`Scene ${i + 1}`}
                description={c.description ?? `Relationship level ${c.level - 1}`}
                onClick={() => handleWatchCinematic(c)}
                accent="pink"
              />
            ))}
          </div>
        )}
      </div>

      {/* Cinematic overlay */}
      <CinematicsModal
        cinematic={activeCinematic}
        opponentAvatarUrl={opponentAvatarUrl}
        opponentSprite={lastDefeatedOpponent?.sprite}
        opponentName={lastDefeatedOpponent?.name ?? ''}
        onClose={() => setActiveCinematic(null)}
      />

      {/* Conversation overlay (chat / gift) */}
      {pendingConversation && (
        <ConversationOverlay
          conversations={pendingConversation}
          opponentAvatarUrl={opponentAvatarUrl}
          opponentSprite={lastDefeatedOpponent?.sprite}
          opponentName={lastDefeatedOpponent?.name ?? ''}
          onComplete={handleConversationComplete}
        />
      )}
    </div>
  );
}

interface MenuButtonProps {
  icon: string;
  label: string;
  description: string;
  disabled?: boolean;
  disabledReason?: string;
  onClick: () => void;
  accent?: 'gold' | 'pink';
}

function MenuButton({ icon, label, description, disabled, disabledReason, onClick, accent }: MenuButtonProps) {
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
      `}
    >
      <span className="text-3xl shrink-0">{icon}</span>
      <div className="flex-1 min-w-0">
        <div className="font-bold text-text-bright text-sm">{label}</div>
        <div className="text-xs text-text-muted mt-0.5">
          {disabled && disabledReason ? disabledReason : description}
        </div>
      </div>
      {!disabled && <span className="text-text-muted text-lg shrink-0">▶</span>}
    </button>
  );
}
