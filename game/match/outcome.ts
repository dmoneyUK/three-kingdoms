export type MatchOutcome = "lord_loyalist" | "rebel" | "traitor";

type OutcomePlayer = { alive: number | boolean; role?: string | null };

/** Pure Standard role victory rules. Persistence belongs to the room route. */
export function determineMatchOutcome(players: OutcomePlayer[]): MatchOutcome | null {
  const alive = players.filter((player) => Boolean(player.alive));
  const lord = players.find((player) => player.role === "Lord");
  if (!lord?.alive) return alive.length === 1 && alive[0]?.role === "Renegade" ? "traitor" : "rebel";
  if (!alive.some((player) => player.role === "Rebel" || player.role === "Renegade")) return "lord_loyalist";
  return null;
}
