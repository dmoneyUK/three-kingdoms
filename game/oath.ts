export type OathRecipientCandidate = {
  id: string;
  alive: boolean;
  hp: number | null;
  maxHp: number | null;
};

/** The public characters whose HP can actually change when Oath resolves. */
export function oathRecipientIds(players: readonly OathRecipientCandidate[]): string[] {
  return players
    .filter((player) => player.id.length > 0 && player.alive && (player.hp ?? 0) < (player.maxHp ?? 0))
    .map((player) => player.id);
}
