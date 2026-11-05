export const MIN_CLASSIC_PLAYERS = 4;
export const MAX_AVAILABLE_CLASSIC_PLAYERS = 6;

export function roomAvailabilityLimit(storedMaxPlayers: number): number {
  return Math.min(Math.max(0, Math.trunc(storedMaxPlayers)), MAX_AVAILABLE_CLASSIC_PLAYERS);
}
