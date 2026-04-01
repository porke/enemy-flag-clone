// Engine constants – single source of truth for all numeric game parameters.

export const ATTACK_AP_COST = 2;
export const ATTACK_ARMY_COST = 1; // deducted only when army > 0
export const ABANDON_AP_COST = 1;
export const ATTACK_BUILDING_DAMAGE = 1; // HP dealt to a building per attack hit

// Attack legality
export const MIN_ATTACK_OWNED_NEIGHBORS = 2; // min owned 8-neighbors for condition 6

// Hit points
export const TOWN_HALL_MAX_HP = 3;
export const OTHER_BUILDING_HP = 2; // placeholder for future buildings

// Starting resources (applied by mapLoader for every player at game start)
export const STARTING_AP = 8;
export const STARTING_GOLD = 350;
export const STARTING_ARMY = 20;
export const STARTING_AP_CAP = 12; // base AP cap at XP=0 (= AP_CAP_BASE)

// Resource caps
export const GOLD_CAP = 20_000;
export const ARMY_CAP = 200;
export const AP_CAP_MAX = 200;

// Income
export const BASE_AP_INCOME = 8;
export const BASE_GOLD_INCOME = 2;
export const INTERNAL_SECTORS_PER_AP_INCOME = 50;  // +1 AP per this many internal sectors
export const BORDER_SECTORS_PER_AP_INCOME = 100;   // +1 AP per this many border sectors

// XP awards
export const XP_ATTACK_ENEMY = 1;       // per attack on an enemy-owned sector
export const XP_ATTACK_NEUTRAL = 0.25;  // per attack on a neutral sector
export const XP_CLAIM_ENEMY = 1.5;      // for claiming/annexing an enemy sector
export const XP_CLAIM_NEUTRAL = 0.375;  // for claiming/annexing a neutral sector
export const XP_DESTROY_TOWN_HALL = 15; // bonus for destroying an enemy Town Hall

// AP cap formula: min(AP_CAP_MAX, STARTING_AP_CAP + floor(xp / XP_PER_AP_CAP))
export const XP_PER_AP_CAP = 8; // XP required per +1 to AP cap
