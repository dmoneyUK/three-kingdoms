import { canUseAction, type CurrentAction, type GameplayAction } from "./protocol.js";

export type OrdinaryTurnAction = Extract<GameplayAction, "play_card" | "serpent_spear_attack" | "trigger" | "end_turn">;

export function isOrdinaryTurnActionAuthorized(input: {
  status: string;
  phase: string | null;
  isMyTurn: boolean;
  isMyAction: boolean;
  viewerId: string | null;
  currentAction: CurrentAction | null;
}, action: OrdinaryTurnAction) {
  return input.status === "playing"
    && input.phase?.startsWith("play") === true
    && input.isMyTurn
    && input.isMyAction
    && input.currentAction?.kind === "turn"
    && input.currentAction.actorId === input.viewerId
    && canUseAction(input.currentAction, action);
}
