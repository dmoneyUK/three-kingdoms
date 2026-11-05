export type LustNamedParticipant = Readonly<{ id: string; name: string }>;

/** Keep Duel order attached to the server-proven participant identities. */
export function compactLustDuelOrderMessage(
  first: LustNamedParticipant,
  second: LustNamedParticipant,
  firstActor: LustNamedParticipant,
): string | null {
  const firstName = first.name.trim();
  const secondName = second.name.trim();
  if (!first.id || !second.id || first.id === second.id || !firstName || !secondName
    || firstActor.id !== first.id && firstActor.id !== second.id) return null;
  const firstAttacksFirst = firstActor.id === first.id;
  return `${firstName} ${firstAttacksFirst ? "first" : "second"}\n${secondName} ${firstAttacksFirst ? "second" : "first"}`;
}

/** Preserve full public participant identity in compact Attack narration. */
export function compactLustDuelAttackMessage(actorName: string | null, targetName: string | null): string | null {
  const actor = actorName?.trim();
  const target = targetName?.trim();
  return actor && target ? `${actor} attacks ${target}` : null;
}

/** Result copy may be shorter in wording, but never shortens player identity. */
export function compactLustDuelResultMessage(
  failedName: string | undefined,
  damageSourceName: string | undefined,
  damageAmount: number,
): string | undefined {
  const failed = failedName?.trim();
  if (!failed) return undefined;
  if (damageAmount === 0) return `Duel: ${failed} failed Attack; damage prevented.`;
  const damageSource = damageSourceName?.trim();
  if (!damageSource) return undefined;
  return `Duel: ${failed} failed Attack; ${damageAmount} damage from ${damageSource}.`;
}
