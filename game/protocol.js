/** Runtime protocol values shared by the API, browser and Node tests. */
export const GAMEPLAY_ACTIONS = [
  "draw", "play_card", "serpent_spear_attack", "end_turn", "discard_cards", "respond", "decline_response", "trigger", "decline_trigger", "preview_harvest", "choose_harvest", "choose_target_card", "choose_borrowed_sword_target", "start_response_timer", "start_rescue_timer", "give_peach", "skip_rescue", "advance_timers",
];

export function pendingKindOf(pending) { return pending?.kind ?? null; }
export function canUseAction(currentAction, action) { return Boolean(currentAction?.legalActions?.includes(action)); }
