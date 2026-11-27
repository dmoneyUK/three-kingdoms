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
  const currentAction = input.currentAction;
  const decisionOwnerMatches = Boolean(
    input.status === "playing"
    && input.isMyAction
    && currentAction?.actorId === input.viewerId,
  );

  // A server-authored TriggerPending is already the exact authorization for
  // turn-start, Draw, Judgement, response, and other skill decisions. Keep
  // these legal selections available even when the ordinary Play phase has
  // not begun (or the trigger actor is not the current turn owner).
  if (action === "trigger" && currentAction?.kind === "trigger") {
    return decisionOwnerMatches && canUseAction(currentAction, action);
  }

  return input.status === "playing"
    && input.phase?.startsWith("play") === true
    && input.isMyTurn
    && input.isMyAction
    && currentAction?.kind === "turn"
    && currentAction.actorId === input.viewerId
    && canUseAction(currentAction, action);
}
