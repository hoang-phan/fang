import type { GameState, GameScreen, PlayerStats, RewardOption, BattleState, Move, ElementType, OpponentDef, ItemSlot, EquipmentItem } from '../types';
import { SHOP_ITEMS } from '../data/shopItems';
import { generateRewards } from '../utils/rewards';
import { applyXp, calcPlayerXpGain, calcOpponentXpGain, getOpponentProgress, getScaledOpponent, getRelationshipProgress, applyRelXp } from '../utils/xp';
import { generateShopEquipment, generateEquipmentItem, computeEquipmentStats, equipmentCost, CATEGORY_SLOTS } from '../utils/equipment';

/** Pick 4–6 items from the backend pool, re-rolling affixes on each so stats are randomized. */
function pickShopEquipment(pool: EquipmentItem[] | undefined): EquipmentItem[] {
  if (!pool || pool.length === 0) return generateShopEquipment();
  const shuffled = [...pool].sort(() => Math.random() - 0.5);
  const count = 4 + Math.floor(Math.random() * 3);
  return shuffled.slice(0, Math.min(count, shuffled.length)).map(
    item => generateEquipmentItem(item.category, item.quality)
  );
}
import { rollDrop } from '../utils/drops';

export type StatPointTarget = ElementType | 'baseDamage' | 'baseDefense';

export type GameAction =
  | { type: 'SET_PLAYER_NAME'; name: string }
  | { type: 'SELECT_OPPONENT'; opponentId: string }
  | { type: 'START_BATTLE'; opponentDef: OpponentDef }
  | { type: 'BATTLE_VICTORY'; finalBattleState: BattleState; goldSeed: number }
  | { type: 'BATTLE_DEFEAT' }
  | { type: 'CHOOSE_REWARD'; reward: RewardOption; shopItems?: EquipmentItem[]; replacePoolMoveId?: string }
  | { type: 'GO_TO_SHOP'; shopItems?: EquipmentItem[] }
  | { type: 'GO_TO_OPPONENT_SELECT' }
  | { type: 'GO_TO_START_SCREEN' }
  | { type: 'GO_TO_GALLERY' }
  | { type: 'NEW_GAME' }
  | { type: 'BUY_SHOP_ITEM'; itemId: string }
  | { type: 'EQUIP_MOVE'; move: Move; slot: 0 | 1 | 2 | 3 }
  | { type: 'UNEQUIP_MOVE'; slot: 0 | 1 | 2 | 3 }
  | { type: 'SPEND_STAT_POINT'; target: StatPointTarget }
  | { type: 'BUY_EQUIPMENT'; itemId: string }
  | { type: 'EQUIP_ITEM'; itemId: string; slot: ItemSlot }
  | { type: 'UNEQUIP_ITEM'; slot: ItemSlot }
  | { type: 'SELL_ITEM'; itemId: string }
  | { type: 'INTERACTION_CHAT'; opponentId: string; shopItems?: EquipmentItem[] }
  | { type: 'INTERACTION_GIFT'; opponentId: string; giftId: number; shopItems?: EquipmentItem[] }
  | { type: 'INTERACTION_CINEMATIC'; opponentId: string; relationshipGain: number; shopItems?: EquipmentItem[] }
  | { type: 'REROLL_OPPONENT'; newOpponentId: string }
  | { type: 'UNLEARN_MOVE'; moveId: string };

export const DEFAULT_PLAYER: PlayerStats = {
  name: 'Hero',
  sprite: '🧙',
  maxHp: 100,
  hp: 100,
  maxMp: 80,
  mp: 80,
  moves: [null, null, null, null],
  learnedPool: [],
  gold: 0,
  level: 1,
  xp: 0,
  statPoints: 0,
  stats: {},
  baseDamage: 0,
  baseDefense: 0,
  inventory: [],
  equipped: {},
};

export const DEFAULT_GAME_STATE: GameState = {
  screen: 'name_entry',
  player: DEFAULT_PLAYER,
  defeatedOpponents: [],
  pendingRewards: [],
  selectedOpponentId: null,
  activeBattle: null,
  opponentProgress: {},
  relationshipProgress: {},
  lastDefeatedOpponent: null,
  shopEquipment: [],
};

function restorePlayer(player: PlayerStats): PlayerStats {
  return { ...player, hp: player.maxHp, mp: player.maxMp };
}

export function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'SET_PLAYER_NAME': {
      return {
        ...state,
        screen: 'opponent_select',
        player: { ...state.player, name: action.name.trim() || state.player.name },
      };
    }

    case 'SELECT_OPPONENT': {
      return { ...state, selectedOpponentId: action.opponentId };
    }

    case 'START_BATTLE': {
      const { opponentDef } = action;
      const oppProgress = getOpponentProgress(state.opponentProgress, opponentDef.id, opponentDef.level);
      const scaledOpponent = getScaledOpponent(opponentDef, oppProgress);

      const eqStats = computeEquipmentStats(state.player.equipped);
      const mergedStats = { ...state.player.stats };
      for (const [el, bonus] of Object.entries(eqStats.elementDamage) as [ElementType, number][]) {
        mergedStats[el] = (mergedStats[el] ?? 0) + bonus;
      }
      const equippedPlayer: PlayerStats = {
        ...state.player,
        maxHp: state.player.maxHp + eqStats.hpBoost,
        maxMp: state.player.maxMp + eqStats.mpBoost,
        baseDamage: state.player.baseDamage + eqStats.bonusDamage,
        baseDefense: state.player.baseDefense + eqStats.bonusDefense,
        stats: mergedStats,
      };
      const freshPlayer = restorePlayer(equippedPlayer);

      const battleState: BattleState = {
        phase: 'player_turn',
        player: freshPlayer,
        opponent: { def: scaledOpponent, hp: scaledOpponent.maxHp },
        log: [{ id: 0, text: `A wild ${opponentDef.name} appeared!`, type: 'system' }],
        turn: 1,
        lastPlayerDamage: null,
        lastOpponentDamage: null,
        opponentMovesUsed: [],
        activeEffects: [],
        playerStunned: false,
        opponentStunned: false,
        hpRegenPerTurn: eqStats.hpRegen,
        mpRegenPerTurn: eqStats.mpRegen,
      };
      return {
        ...state,
        screen: 'battle' as GameScreen,
        activeBattle: battleState,
      };
    }

    case 'BATTLE_VICTORY': {
      const { finalBattleState, goldSeed } = action;
      const opponentDef = finalBattleState.opponent.def;

      // Compute equipment stats for gold/drop bonuses (use canonical player equipped gear)
      const victoryEqStats = computeEquipmentStats(state.player.equipped);
      const baseRewards = generateRewards(opponentDef, state.player, goldSeed, finalBattleState.opponentMovesUsed);

      // Apply gold loot boost and attach hidden drop to the loot reward
      const droppedItem = rollDrop(opponentDef.level, victoryEqStats.dropChanceBoostPct);
      const rewards: RewardOption[] = baseRewards.map(r => {
        if (r.type !== 'loot' || r.gold == null) return r;
        const boostedGold = Math.round(r.gold * (1 + victoryEqStats.goldLootBoostPct / 100));
        return {
          ...r,
          gold: boostedGold,
          description: `Claim ${boostedGold} gold from the fallen foe.`,
          droppedItem: droppedItem ?? undefined,
        };
      });
      const defeatedOpponents = state.defeatedOpponents.includes(opponentDef.id)
        ? state.defeatedOpponents
        : [...state.defeatedOpponents, opponentDef.id];

      // Player gains XP for winning.
      // Use state.player (canonical, no equipment bonuses) as the base — finalBattleState.player
      // is an ephemeral snapshot with equipment stats baked in and must not be persisted.
      const playerXpGain = calcPlayerXpGain(opponentDef, true);
      const playerXpResult = applyXp(state.player.level, state.player.xp, playerXpGain);
      const updatedPlayer: PlayerStats = {
        ...state.player,
        level: playerXpResult.level,
        xp: playerXpResult.xp,
        statPoints: state.player.statPoints + playerXpResult.levelsGained,
      };

      // Opponent gains XP for losing (small amount)
      const oppProgress = getOpponentProgress(state.opponentProgress, opponentDef.id, opponentDef.level);
      const oppXpGain = calcOpponentXpGain(opponentDef, false);
      const oppXpResult = applyXp(oppProgress.level, oppProgress.xp, oppXpGain);

      return {
        ...state,
        screen: 'reward',
        player: updatedPlayer,
        defeatedOpponents,
        pendingRewards: rewards,
        activeBattle: null,
        lastDefeatedOpponent: opponentDef,
        opponentProgress: {
          ...state.opponentProgress,
          [opponentDef.id]: { level: oppXpResult.level, xp: oppXpResult.xp },
        },
      };
    }

    case 'BATTLE_DEFEAT': {
      const opponentDef = state.activeBattle?.opponent.def;
      if (!opponentDef) {
        return { ...state, screen: 'opponent_select', activeBattle: null, selectedOpponentId: null };
      }

      // Player gains small XP for losing
      const playerXpGain = calcPlayerXpGain(opponentDef, false);
      const playerXpResult = applyXp(state.player.level, state.player.xp, playerXpGain);
      const updatedPlayer: PlayerStats = {
        ...state.player,
        level: playerXpResult.level,
        xp: playerXpResult.xp,
        statPoints: state.player.statPoints + playerXpResult.levelsGained,
      };

      // Opponent gains big XP for winning
      const oppProgress = getOpponentProgress(state.opponentProgress, opponentDef.id, opponentDef.level);
      const oppXpGain = calcOpponentXpGain(opponentDef, true);
      const oppXpResult = applyXp(oppProgress.level, oppProgress.xp, oppXpGain);

      return {
        ...state,
        screen: 'opponent_select',
        activeBattle: null,
        selectedOpponentId: null,
        player: updatedPlayer,
        opponentProgress: {
          ...state.opponentProgress,
          [opponentDef.id]: { level: oppXpResult.level, xp: oppXpResult.xp },
        },
      };
    }

    case 'CHOOSE_REWARD': {
      const { reward } = action;
      let player = { ...state.player };

      if (reward.type === 'cinematic') {
        return { ...state, pendingRewards: [], screen: 'shop', shopEquipment: pickShopEquipment(action.shopItems) };
      }

      if (reward.type === 'loot' && reward.gold != null) {
        player = { ...player, gold: player.gold + reward.gold };
        if (reward.droppedItem) {
          player = { ...player, inventory: [...player.inventory, reward.droppedItem] };
        }
      } else if (reward.type === 'learn_new' && reward.move) {
        const emptySlot = player.moves.findIndex(m => m === null);
        const newMoves = [...player.moves] as PlayerStats['moves'];
        if (emptySlot !== -1) {
          newMoves[emptySlot] = { ...reward.move, level: 1 };
          player = { ...player, moves: newMoves };
        } else if (player.learnedPool.length < 2) {
          player = { ...player, learnedPool: [...player.learnedPool, { ...reward.move, level: 1 }] };
        } else if (action.replacePoolMoveId) {
          // All 6 slots full — player chose to replace a specific backup move
          const newPool = player.learnedPool.map(m =>
            m.id === action.replacePoolMoveId ? { ...reward.move!, level: 1 } : m
          );
          player = { ...player, learnedPool: newPool };
        }
      } else if (reward.type === 'upskill' && reward.move) {
        const moveId = reward.move.id;
        const newMoves = player.moves.map(m =>
          m?.id === moveId ? { ...m, level: m.level + 1 } : m
        ) as PlayerStats['moves'];
        const newPool = player.learnedPool.map(m =>
          m.id === moveId ? { ...m, level: m.level + 1 } : m
        );
        player = { ...player, moves: newMoves, learnedPool: newPool };
      }

      return {
        ...state,
        player,
        pendingRewards: state.pendingRewards.filter(r => r !== reward),
        screen: 'shop',
        shopEquipment: pickShopEquipment(action.shopItems),
      };
    }

    case 'GO_TO_SHOP': {
      return { ...state, screen: 'shop', pendingRewards: [], shopEquipment: pickShopEquipment(action.shopItems) };
    }

    case 'GO_TO_OPPONENT_SELECT': {
      return { ...state, screen: 'opponent_select', selectedOpponentId: null, lastDefeatedOpponent: null };
    }

    case 'GO_TO_START_SCREEN': {
      return { ...state, screen: 'start' };
    }

    case 'GO_TO_GALLERY': {
      return { ...state, screen: 'gallery' };
    }

    case 'NEW_GAME': {
      return { ...DEFAULT_GAME_STATE, screen: 'name_entry' };
    }

    case 'BUY_SHOP_ITEM': {
      const item = SHOP_ITEMS.find(i => i.id === action.itemId);
      if (!item) return state;
      if (state.player.gold < item.cost) return state;
      let player = { ...state.player, gold: state.player.gold - item.cost };
      switch (item.type) {
        case 'hp_restore':
          player = { ...player, hp: Math.min(player.maxHp, player.hp + item.value) };
          break;
        case 'mp_restore':
          player = { ...player, mp: Math.min(player.maxMp, player.mp + item.value) };
          break;
        case 'max_hp_up':
          player = { ...player, maxHp: player.maxHp + item.value, hp: player.hp + item.value };
          break;
        case 'max_mp_up':
          player = { ...player, maxMp: player.maxMp + item.value, mp: player.mp + item.value };
          break;
      }
      return { ...state, player };
    }

    case 'EQUIP_MOVE': {
      const { move, slot } = action;
      const newMoves = [...state.player.moves] as PlayerStats['moves'];
      const displaced = newMoves[slot];
      newMoves[slot] = move;
      // Pool after removing the move being equipped
      const poolWithoutMove = state.player.learnedPool.filter(m => m.id !== move.id);
      // Displaced active move goes back to pool only if there's room (cap = 2)
      const newPool = displaced && poolWithoutMove.length < 2
        ? [...poolWithoutMove, displaced]
        : poolWithoutMove;
      return {
        ...state,
        player: { ...state.player, moves: newMoves, learnedPool: newPool },
      };
    }

    case 'UNEQUIP_MOVE': {
      const { slot } = action;
      const move = state.player.moves[slot];
      if (!move) return state;
      const newMoves = [...state.player.moves] as PlayerStats['moves'];
      newMoves[slot] = null;
      return {
        ...state,
        player: {
          ...state.player,
          moves: newMoves,
          learnedPool: [...state.player.learnedPool, move],
        },
      };
    }

    case 'SPEND_STAT_POINT': {
      if (state.player.statPoints <= 0) return state;
      const { target } = action;
      if (target === 'baseDamage') {
        return {
          ...state,
          player: {
            ...state.player,
            statPoints: state.player.statPoints - 1,
            baseDamage: state.player.baseDamage + 1,
          },
        };
      }
      if (target === 'baseDefense') {
        return {
          ...state,
          player: {
            ...state.player,
            statPoints: state.player.statPoints - 1,
            baseDefense: state.player.baseDefense + 1,
          },
        };
      }
      const current = state.player.stats?.[target] ?? 0;
      return {
        ...state,
        player: {
          ...state.player,
          statPoints: state.player.statPoints - 1,
          stats: { ...(state.player.stats ?? {}), [target]: current + 1 },
        },
      };
    }

    case 'BUY_EQUIPMENT': {
      const item = state.shopEquipment.find(i => i.id === action.itemId);
      if (!item) return state;
      const cost = equipmentCost(item);
      if (state.player.gold < cost) return state;
      return {
        ...state,
        player: {
          ...state.player,
          gold: state.player.gold - cost,
          inventory: [...state.player.inventory, item],
        },
        shopEquipment: state.shopEquipment.filter(i => i.id !== action.itemId),
      };
    }

    case 'EQUIP_ITEM': {
      const { itemId, slot } = action;
      const item = state.player.inventory.find(i => i.id === itemId);
      if (!item || !CATEGORY_SLOTS[item.category].includes(slot)) return state;
      const displaced = state.player.equipped[slot];
      const newInventory = state.player.inventory
        .filter(i => i.id !== itemId)
        .concat(displaced ? [displaced] : []);
      return {
        ...state,
        player: {
          ...state.player,
          inventory: newInventory,
          equipped: { ...state.player.equipped, [slot]: item },
        },
      };
    }

    case 'UNEQUIP_ITEM': {
      const { slot } = action;
      const item = state.player.equipped[slot];
      if (!item) return state;
      const newEquipped = { ...state.player.equipped };
      delete newEquipped[slot];
      return {
        ...state,
        player: {
          ...state.player,
          equipped: newEquipped,
          inventory: [...state.player.inventory, item],
        },
      };
    }

    case 'SELL_ITEM': {
      const { itemId } = action;
      const item = state.player.inventory.find(i => i.id === itemId);
      if (!item) return state;
      const sellValue = Math.floor(equipmentCost(item) * 0.4);
      return {
        ...state,
        player: {
          ...state.player,
          gold: state.player.gold + sellValue,
          inventory: state.player.inventory.filter(i => i.id !== itemId),
        },
      };
    }

    case 'INTERACTION_CHAT': {
      const rel = getRelationshipProgress(state.relationshipProgress, action.opponentId);
      const updated = applyRelXp(rel, 15);
      return {
        ...state,
        screen: 'shop',
        pendingRewards: [],
        shopEquipment: pickShopEquipment(action.shopItems),
        relationshipProgress: { ...state.relationshipProgress, [action.opponentId]: updated },
      };
    }

    case 'INTERACTION_GIFT': {
      const opponent = state.lastDefeatedOpponent;
      const gift = opponent?.gifts?.find(g => g.id === action.giftId);
      if (!gift) return state;
      if (state.player.gold < gift.gold) return state;
      const rel = getRelationshipProgress(state.relationshipProgress, action.opponentId);
      const updated = applyRelXp(rel, gift.exp);
      return {
        ...state,
        screen: 'shop',
        pendingRewards: [],
        shopEquipment: pickShopEquipment(action.shopItems),
        player: { ...state.player, gold: state.player.gold - gift.gold },
        relationshipProgress: { ...state.relationshipProgress, [action.opponentId]: updated },
      };
    }

    case 'INTERACTION_CINEMATIC': {
      const rel = getRelationshipProgress(state.relationshipProgress, action.opponentId);
      const updated = applyRelXp(rel, action.relationshipGain);
      return {
        ...state,
        screen: 'shop',
        pendingRewards: [],
        shopEquipment: pickShopEquipment(action.shopItems),
        relationshipProgress: { ...state.relationshipProgress, [action.opponentId]: updated },
      };
    }

    case 'REROLL_OPPONENT': {
      const cost = Math.max(1, Math.floor(state.player.gold * 0.1));
      if (state.player.gold < cost) return state;
      return {
        ...state,
        player: { ...state.player, gold: state.player.gold - cost },
        selectedOpponentId: action.newOpponentId,
      };
    }

    case 'UNLEARN_MOVE': {
      const { moveId } = action;
      const newMoves = state.player.moves.map(m =>
        m?.id === moveId ? null : m
      ) as PlayerStats['moves'];
      const newPool = state.player.learnedPool.filter(m => m.id !== moveId);
      return {
        ...state,
        player: { ...state.player, moves: newMoves, learnedPool: newPool },
      };
    }

    default:
      return state;
  }
}
