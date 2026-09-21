/** Small persisted facts about the current turn, shared by hero/equipment capabilities. */
export type TurnHistoryState = {
  turnPlayerId?: string;
  attackUsed?: boolean;
};

export function turnHistoryFor(playerId: string): TurnHistoryState {
  return { turnPlayerId: playerId };
}

export function attackWasUsed(state: TurnHistoryState, playerId: string) {
  return state.turnPlayerId === playerId && state.attackUsed === true;
}

/** Record an Attack only when the actor is the authoritative owner of this turn. */
export function recordAttackForTurn<T extends TurnHistoryState>(state: T, turnPlayerId: string | null | undefined, actorId: string): T {
  return turnPlayerId && turnPlayerId === actorId
    ? { ...state, turnPlayerId, attackUsed: true }
    : state;
}
