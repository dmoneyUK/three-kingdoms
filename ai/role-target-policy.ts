export type RoleActionDisposition = "hostile" | "global_harm" | "delayed_harm" | "helpful" | "neutral" | "unknown";

export type RolePolicyContext = Readonly<{
  actorId: string;
  actorRole: string | null;
  /** The live Lord is public. No other player's role belongs in this context. */
  publicLordId: string | null;
  livingPlayerIds: readonly string[];
}>;

export type RoleActionIntent = Readonly<{
  disposition: RoleActionDisposition;
  targetIds?: readonly string[];
  /** The effect can hit every opponent or may later hit the Lord. */
  mayAffectLord?: boolean;
  /** A canonical continuation requires this action; it is not a voluntary play. */
  forced?: boolean;
  /** Comparable actions (same effective kind and cost) retain their normal order. */
  comparisonKey?: string;
}>;

export type RolePolicyDenialReason =
  | "loyalist_protect_lord"
  | "loyalist_aoe_endangers_lord"
  | "renegade_delay_lord"
  | "unknown_harm_requires_review"
  | "authority_gap_forced_harm";

export type RolePolicyAssessment = Readonly<{
  allowed: boolean;
  preference: 0 | 1;
  reason?: RolePolicyDenialReason | "rebel_prioritize_lord";
}>;

export function assessRoleAction(context: RolePolicyContext, intent: RoleActionIntent): RolePolicyAssessment {
  const lordAlive = Boolean(context.publicLordId && context.livingPlayerIds.includes(context.publicLordId));
  const targetsLord = Boolean(lordAlive && context.publicLordId && intent.targetIds?.includes(context.publicLordId));
  const canAffectLord = lordAlive && (intent.mayAffectLord === true || targetsLord);
  const hasHarmfulScope = intent.disposition === "hostile" || intent.disposition === "global_harm"
    || intent.disposition === "delayed_harm" || intent.disposition === "unknown";

  if (intent.forced && canAffectLord && hasHarmfulScope
    && (context.actorRole === "Loyalist" || context.actorRole === "Renegade" && context.livingPlayerIds.length > 2)) {
    return { allowed: false, preference: 0, reason: "authority_gap_forced_harm" };
  }

  if (lordAlive && context.actorRole === "Loyalist") {
    if (intent.disposition === "global_harm" || intent.disposition === "delayed_harm"
      || intent.mayAffectLord === true && intent.disposition !== "unknown") {
      return { allowed: false, preference: 0, reason: "loyalist_aoe_endangers_lord" };
    }
    if (targetsLord && intent.disposition === "hostile") {
      return { allowed: false, preference: 0, reason: "loyalist_protect_lord" };
    }
    if ((targetsLord || intent.mayAffectLord === true) && intent.disposition === "unknown") {
      return { allowed: false, preference: 0, reason: "unknown_harm_requires_review" };
    }
  }

  if (lordAlive && context.actorRole === "Renegade" && context.livingPlayerIds.length > 2) {
    if (intent.disposition === "global_harm" || intent.disposition === "delayed_harm"
      || intent.mayAffectLord === true && intent.disposition !== "unknown") {
      return { allowed: false, preference: 0, reason: "renegade_delay_lord" };
    }
    if (targetsLord && (intent.disposition === "hostile" || intent.disposition === "unknown")) {
      return { allowed: false, preference: 0,
        reason: intent.disposition === "unknown" ? "unknown_harm_requires_review" : "renegade_delay_lord" };
    }
    if (intent.mayAffectLord === true && intent.disposition === "unknown") {
      return { allowed: false, preference: 0, reason: "unknown_harm_requires_review" };
    }
  }

  const prefersLord = lordAlive && context.actorRole === "Rebel" && targetsLord && intent.disposition === "hostile";
  return prefersLord
    ? { allowed: true, preference: 1, reason: "rebel_prioritize_lord" }
    : { allowed: true, preference: 0 };
}

export function filterAndRankRoleActions<T>(
  context: RolePolicyContext,
  entries: readonly Readonly<{ value: T; intent: RoleActionIntent }>[],
): { allowed: T[]; rejected: Array<Readonly<{ value: T; reason: RolePolicyDenialReason }>> } {
  const allowedEntries: Array<{ value: T; intent: RoleActionIntent; preference: 0 | 1; groupKey: string }> = [];
  const rejected: Array<Readonly<{ value: T; reason: RolePolicyDenialReason }>> = [];
  const groups = new Map<string, { preferred: Array<typeof allowedEntries[number]>; ordinary: Array<typeof allowedEntries[number]> }>();

  for (const [index, entry] of entries.entries()) {
    const assessment = assessRoleAction(context, entry.intent);
    if (!assessment.allowed) {
      rejected.push({ value: entry.value, reason: assessment.reason ?? "unknown_harm_requires_review" });
      continue;
    }
    const groupKey = entry.intent.comparisonKey ?? `__role_policy_singleton_${index}`;
    const accepted = { ...entry, preference: assessment.preference, groupKey };
    allowedEntries.push(accepted);
    const group = groups.get(groupKey) ?? { preferred: [], ordinary: [] };
    (assessment.preference ? group.preferred : group.ordinary).push(accepted);
    groups.set(groupKey, group);
  }

  const cursors = new Map<string, { values: Array<typeof allowedEntries[number]>; index: number }>();
  for (const [key, group] of groups) cursors.set(key, { values: [...group.preferred, ...group.ordinary], index: 0 });
  const ordered = allowedEntries.map(({ groupKey }) => {
    const cursor = cursors.get(groupKey)!;
    return cursor.values[cursor.index++].value;
  });
  return { allowed: ordered, rejected };
}
