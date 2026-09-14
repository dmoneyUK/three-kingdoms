type LegacyResponseInput = {
  action: "respond" | "decline_response";
  providerId?: string;
};

/**
 * Temporary saved-client boundary. New UI code submits canonical actions;
 * these names are translated once before the domain decision path runs.
 */
export function normalizeLegacyTriggerAction(action: string) {
  return {
    respond_green_dragon: { action: "trigger", providerId: "green_dragon_blade_attack_dodged" },
    pass_green_dragon: { action: "decline_trigger" },
    respond_rock_cleaving: { action: "trigger", providerId: "rock_cleaving_axe_attack_dodged" },
    pass_rock_cleaving: { action: "decline_trigger" },
    use_frost_sword: { action: "trigger", providerId: "frost_sword_damage_about_to_apply" },
    pass_frost_sword: { action: "decline_trigger" },
  }[action];
}

/**
 * Old clients name the concrete card/equipment action.  New gameplay never
 * sees those names: translate once at ingress to the semantic decision.
 * A two-card legacy Duel/AOE response was Serpent Spear; every other legacy
 * physical response is the ordinary card provider.
 */
export function normalizeLegacyResponseAction(action: string, cardIds?: unknown): LegacyResponseInput | undefined {
  const usesTwoCards = Array.isArray(cardIds) && cardIds.length === 2;
  switch (action) {
    case "respond_dodge": return { action: "respond", providerId: "card" };
    case "respond_eight_trigrams": return { action: "respond", providerId: "eight_trigrams_dodge" };
    case "respond_negation": return { action: "respond", providerId: "negation_card" };
    case "respond_duel":
    case "respond_group": return { action: "respond", providerId: usesTwoCards ? "serpent_spear_attack" : "card" };
    case "take_damage":
    case "take_duel_damage":
    case "take_group_damage":
    case "pass_negation": return { action: "decline_response" };
  }
}
