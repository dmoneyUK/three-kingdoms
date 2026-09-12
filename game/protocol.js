/** Runtime protocol values shared by the API, browser and Node tests. */
export const GAMEPLAY_ACTIONS = [
  "draw", "play_card", "serpent_spear_attack", "end_turn", "discard_cards", "respond", "respond_dodge", "respond_eight_trigrams", "take_damage", "respond_green_dragon", "pass_green_dragon", "respond_rock_cleaving", "pass_rock_cleaving", "use_frost_sword", "pass_frost_sword", "respond_duel", "take_duel_damage", "respond_group", "take_group_damage", "respond_negation", "pass_negation", "preview_harvest", "choose_harvest", "choose_target_card", "start_response_timer", "start_rescue_timer", "give_peach", "skip_rescue", "advance_timers",
];

export function pendingKindOf(pending) { return pending?.kind ?? null; }
export function canUseAction(currentAction, action) { return Boolean(currentAction?.legalActions?.includes(action)); }
