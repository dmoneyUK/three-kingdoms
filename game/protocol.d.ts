import type { Pending } from "./pending";

export const GAMEPLAY_ACTIONS: readonly ["draw", "play_card", "serpent_spear_attack", "end_turn", "discard_cards", "respond", "decline_response", "trigger", "decline_trigger", "respond_dodge", "respond_eight_trigrams", "take_damage", "respond_green_dragon", "pass_green_dragon", "respond_rock_cleaving", "pass_rock_cleaving", "use_frost_sword", "pass_frost_sword", "respond_duel", "take_duel_damage", "respond_group", "take_group_damage", "respond_negation", "pass_negation", "preview_harvest", "choose_harvest", "choose_target_card", "start_response_timer", "start_rescue_timer", "give_peach", "skip_rescue", "advance_timers"];
export type GameplayAction = (typeof GAMEPLAY_ACTIONS)[number];
export type PendingKind = Pending["kind"];
export type ResponseRequirement = "attack" | "dodge" | "negate";
export type ResponseSelection = { type: "cards"; min: number; max: number; eligibleCardIds: string[] } | null;
export type ResponseOptionView = { providerId: string; satisfies: ResponseRequirement; activation: "implicit" | "explicit"; label: string; selection: ResponseSelection };
export type TriggerOptionView = { effectId: string; label: string; selection: { type: "cards"; min: number; max: number; eligibleCardIds: string[] } | { type: "target_cards"; targetId: string; min: number; max: number; eligibleKeys: string[] } | { type: "choice"; choices: { id: string; label: string }[]; eligibleHandKeys: string[] } | null };
export type CurrentAction = { version: 3; kind: PendingKind | "response" | "turn" | "none"; actorId: string | null; deadline: number; reason: string; legalActions: GameplayAction[]; requirement?: ResponseRequirement; options?: ResponseOptionView[]; triggerEvent?: "attack_targeted" | "attack_dodged" | "damage_about_to_apply"; triggerOptions?: TriggerOptionView[]; declineAction?: GameplayAction; presentation?: { resolutionId: string | null; readyAfterEventId: string | null } };
export function pendingKindOf(pending: Pick<Pending, "kind"> | null | undefined): PendingKind | null;
export function canUseAction(currentAction: CurrentAction | null | undefined, action: GameplayAction): boolean;
