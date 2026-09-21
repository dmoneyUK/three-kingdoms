import type { Pending } from "./pending";

export const GAMEPLAY_ACTIONS: readonly ["draw", "play_card", "serpent_spear_attack", "end_turn", "discard_cards", "respond", "decline_response", "trigger", "decline_trigger", "preview_harvest", "choose_harvest", "choose_target_card", "choose_borrowed_sword_target", "start_response_timer", "start_rescue_timer", "give_peach", "skip_rescue", "advance_timers"];
export type GameplayAction = (typeof GAMEPLAY_ACTIONS)[number];
export type PendingKind = Pending["kind"];
export type ResponseRequirement = "attack" | "dodge" | "negate";
export type ResponseSelection = { type: "cards"; min: number; max: number; eligibleCardIds: string[] } | null;
export type ResponseOptionView = { providerId: string; satisfies: ResponseRequirement; activation: "implicit" | "explicit"; label: string; selection: ResponseSelection; playedAs?: "attack" | "dodge" };
export type TriggerOptionView = { effectId: string; label: string; description?: string; allowDecline?: boolean; timeoutChoiceId?: string; selection: { type: "cards"; min: number; max: number; eligibleCardIds: string[]; targetIds?: string[] } | { type: "target"; targetIds: string[] } | { type: "target_cards"; targetId: string; min: number; max: number; eligibleKeys: string[] } | { type: "choice"; choices: { id: string; label: string }[]; eligibleHandKeys: string[]; cardCountByChoice?: Record<string, number> } | null };
export type PlayPhaseActionView = { cardId: string; canPlayAs: "attack" };
export type CurrentAction = { version: 3; kind: PendingKind | "response" | "turn" | "none"; actorId: string | null; deadline: number; reason: string; legalActions: GameplayAction[]; canDeclareAttack?: boolean; playPhaseActions?: PlayPhaseActionView[]; requirement?: ResponseRequirement; options?: ResponseOptionView[]; triggerEvent?: "turn_start" | "draw_phase" | "judgement_revealed" | "attack_targeted" | "attack_dodged" | "damage_about_to_apply" | "damage_suffered" | "hero_choice" | "hand_lost"; triggerOptions?: TriggerOptionView[]; declineAction?: GameplayAction; presentation?: { resolutionId: string | null; readyAfterEventId: string | null } };
export function pendingKindOf(pending: Pick<Pending, "kind"> | null | undefined): PendingKind | null;
export function canUseAction(currentAction: CurrentAction | null | undefined, action: GameplayAction): boolean;
