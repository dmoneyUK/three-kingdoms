import { nextAliveSeat } from "../rules";
import { determineMatchOutcome, type MatchOutcome } from "./outcome";

type ContinuationPlayer = { id: string; seat: number; alive: number | boolean };

export type DefeatContinuation =
  | { kind: "finish"; outcome: MatchOutcome }
  | { kind: "resume_group" }
  | { kind: "resume_effect" }
  | { kind: "advance_turn"; nextSeat: number };

/** The single legal decision point after an unrescued Dying player is defeated. */
export function determineDefeatContinuation({ players, turnSeat, resumePlayerId, hasGroupContinuation }: {
  players: ContinuationPlayer[];
  turnSeat: number | null;
  resumePlayerId: string;
  hasGroupContinuation: boolean;
}): DefeatContinuation {
  const outcome = determineMatchOutcome(players);
  if (outcome) return { kind: "finish", outcome };
  const resumePlayer = players.find((player) => player.id === resumePlayerId);
  if (resumePlayer?.alive) return { kind: hasGroupContinuation ? "resume_group" : "resume_effect" };
  const living = players.filter((player) => Boolean(player.alive));
  if (!living.length) return { kind: "finish", outcome: "rebel" };
  return { kind: "advance_turn", nextSeat: nextAliveSeat(players, turnSeat ?? resumePlayer?.seat ?? 0) };
}
