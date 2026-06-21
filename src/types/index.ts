export type MoveId = string;

export type ElementType =
  | 'normal'
  | 'fire'
  | 'water'
  | 'electric'
  | 'grass'
  | 'ice'
  | 'poison'
  | 'earth'
  | 'dark'
  | 'psychic';

export interface Move {
  id: MoveId;
  name: string;
  icon: string;
  description: string;
  mpCost: number;
  baseDamage: number;
  damageVariance: number;
  level: number;
  maxLevel: number;
  type: ElementType;
  effectTurns?: number;    // how many turns the status effect lasts
  effectDamage?: number;   // damage per turn from the effect
  effectProb?: number;     // % chance the effect triggers (DoT and stun)
  effectStun?: boolean;    // if true, effect stuns the target (skips their turn) instead of dealing DoT
  leech?: number;          // % of damage converted to HP for the caster
  baseDefense?: number;    // temporary defense shield per turn (scales with level, lasts effectTurns)
}

// Flat bonus damage added to each elemental type from stat points
export type PlayerStatBonuses = Partial<Record<ElementType, number>>;

export interface PlayerStats {
  name: string;
  sprite: string;
  maxHp: number;
  hp: number;
  maxMp: number;
  mp: number;
  moves: [Move | null, Move | null, Move | null, Move | null];
  learnedPool: Move[];
  gold: number;
  level: number;
  xp: number;
  statPoints: number;       // unspent points available to allocate
  stats: PlayerStatBonuses; // allocated bonuses per element type
  baseDamage: number;       // flat bonus added to all outgoing attacks
  baseDefense: number;      // flat reduction applied to all incoming attacks
  inventory: EquipmentItem[];
  equipped: EquippedItems;
}

export interface Sprite {
  url: string;
  x: number | null;
  y: number | null;
  width: number | null;
  height: number | null;
}

export interface Chat {
  role: 'hero' | 'opponent' | 'other';
  position: number;
  content: string;
  sprites: Sprite[];
}

export interface Conversation {
  id: number;
  chats: Chat[];
  backgroundUrl?: string; // background image for the conversation scene
  position?: number;      // display order (cinematics and gifts only)
}

export interface OpponentCinematic {
  level: number;       // relationship level required to unlock (1-based)
  description?: string;
  conversations?: Conversation[];
}

export interface OpponentGift {
  id: number;
  name: string;
  gold: number;        // cost to give
  exp: number;         // relationship XP gained
  conversations?: Conversation[];
}

export interface OpponentDef {
  id: string;
  name: string;
  sprite: string;
  type: ElementType;
  maxHp: number;
  baseDamage: number;
  baseDefense: number;
  damageVariance: number;
  moves: Move[];
  goldReward: [number, number];
  unlockAfter?: string[];
  flavourText: string;
  level: number;            // opponent's level — determines XP rewards
  xpReward: [number, number]; // [victoryXp for player, defeatXp for player]
  avatars?: string[];       // full image URLs, one per opponent level
  cinematics?: OpponentCinematic[]; // dynamic — any number, ordered by level
  gifts?: OpponentGift[];           // dynamic — any number of gift options
  conversations?: Conversation[];   // top-level chat conversations (one picked randomly on Chat)
}

// Tracks opponent XP progress (they gain XP too — persisted across sessions)
export interface OpponentProgress {
  level: number;
  xp: number;
}

// Tracks relationship progress with a specific opponent
export interface RelationshipProgress {
  level: number; // relationship level (starts at 0)
  xp: number;    // XP within the current relationship level
}

export type BattlePhase =
  | 'player_turn'
  | 'resolving'
  | 'opponent_turn'
  | 'victory'
  | 'defeat';

export interface BattleLogEntry {
  id: number;
  text: string;
  type: 'player' | 'opponent' | 'system';
  moveType?: ElementType;
}

export interface ActiveEffect {
  sourceName: string;    // display name of the move that applied it
  sourceType: ElementType;
  damage: number;        // damage per tick (DoT); 0 for shield/stun effects
  defense: number;       // damage absorbed per incoming hit; 0 for DoT/stun effects
  stunned: boolean;      // if true, target skips their action this turn
  turnsLeft: number;     // ticks remaining
  target: 'player' | 'opponent';
}

export interface BattleState {
  phase: BattlePhase;
  player: PlayerStats;
  opponent: {
    def: OpponentDef;
    hp: number;
  };
  log: BattleLogEntry[];
  turn: number;
  lastPlayerDamage: number | null;
  lastOpponentDamage: number | null;
  opponentMovesUsed: Move[];
  activeEffects: ActiveEffect[];
  playerStunned: boolean;   // true when player's action should be skipped this turn
  opponentStunned: boolean; // true when opponent's action should be skipped this turn
  hpRegenPerTurn: number;   // from equipment hpRegen enhancements
  mpRegenPerTurn: number;   // from equipment mpRegen enhancements
}

export type GameScreen = 'opponent_select' | 'battle' | 'reward' | 'shop';

export interface RewardOption {
  type: 'learn_new' | 'upskill' | 'loot' | 'cinematic';
  move?: Move;
  gold?: number;
  droppedItem?: EquipmentItem; // hidden — only present on loot rewards, revealed when picked
  cinematicUrl?: string;
  label: string;
  description: string;
}

export interface GameState {
  screen: GameScreen;
  player: PlayerStats;
  defeatedOpponents: string[];
  pendingRewards: RewardOption[];
  selectedOpponentId: string | null;
  activeBattle: BattleState | null;
  opponentProgress: Record<string, OpponentProgress>; // xp/level per opponent id
  relationshipProgress: Record<string, RelationshipProgress>; // relationship level/xp per opponent id
  lastDefeatedOpponent: OpponentDef | null;
  shopEquipment: EquipmentItem[];
}

export type ShopItemType = 'hp_restore' | 'mp_restore' | 'max_hp_up' | 'max_mp_up';

export interface ShopItem {
  id: string;
  name: string;
  description: string;
  type: ShopItemType;
  cost: number;
  value: number;
  icon: string;
}

// ─── Equipment System ──────────────────────────────────────────────────────────

// Specific equipped positions — used as keys in EquippedItems
export type ItemSlot =
  | 'headgear' | 'bodyArmor' | 'weapon' | 'shield' | 'amulet'
  | 'ringLeft' | 'ringRight' | 'gauntlets' | 'boots'
  | 'charm1' | 'charm2' | 'charm3';

// Category stamped on EquipmentItem at generation time.
// Rings and charms use shared categories so they can fill any slot of their kind.
export type ItemCategory =
  | 'headgear' | 'bodyArmor' | 'weapon' | 'shield' | 'amulet'
  | 'ring' | 'charm' | 'gauntlets' | 'boots';

export type ItemQuality = 'rude' | 'normal' | 'rare' | 'legendary';

export type EnhancementType =
  | 'hpBoost' | 'mpBoost' | 'damageBoost' | 'defenseBoost'
  | 'elementDamage' | 'hpRegen' | 'mpRegen' | 'elementResist'
  | 'goldLootBoost' | 'dropChanceBoost';

export interface Enhancement {
  type: EnhancementType;
  value: number;
  element?: ElementType; // required for elementDamage / elementResist
}

export interface EquipmentItem {
  id: string;
  category: ItemCategory;
  quality: ItemQuality;
  name: string;
  icon: string;
  baseDamage?: number;  // weapon only
  baseDefense?: number; // headgear, bodyArmor, gauntlets, boots, shield only
  enhancements: Enhancement[];
}

export type EquippedItems = Partial<Record<ItemSlot, EquipmentItem>>;

export interface EquipmentStatDeltas {
  bonusDamage: number;
  bonusDefense: number;
  hpBoost: number;
  mpBoost: number;
  hpRegen: number;
  mpRegen: number;
  elementDamage: Partial<Record<ElementType, number>>;
  elementResist: Partial<Record<ElementType, number>>; // deferred — not yet wired into damage formula
  goldLootBoostPct: number;
  dropChanceBoostPct: number;
}
