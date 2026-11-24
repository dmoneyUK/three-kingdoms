/**
 * Internal Bot principals are already server-minted and are revalidated against
 * the room's canonical player rows below. They must not be treated as an
 * anonymous HTTP token session as well; human callers still require the normal
 * token-hash lookup.
 */
export function shouldLookupAuthenticatedSession(internalBot: boolean): boolean {
  return !internalBot;
}
