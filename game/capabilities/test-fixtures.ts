import type { Card } from "../model";
import type { ResponseProvider } from "../responses";
import type { TriggeredEffect } from "./triggers";

// These capabilities are intentionally inert unless a test-only hero or
// equipment marker is installed directly in the isolated D1 fixture. They
// exercise the same Worker registry and persistence path as a future hero or
// equipment module without adding a real Standard card.
const hasMarker = (cards: Card[] | undefined, marker: string) => Boolean(cards?.some((card) => card.id.includes(marker)));

export const testSemanticResponseProviders: ResponseProvider[] = [
  {
    id: "test_semantic_attack",
    satisfies: "attack",
    activation: "explicit",
    getOption: (context) => context.hero === "test-hero"
      ? { provider: "test_hero", providerId: "test_semantic_attack", satisfies: "attack", label: "Use test Attack", cards: [], selection: null }
      : null,
    resolve: () => ({ status: "satisfied", providerId: "test_semantic_attack", satisfies: "attack" }),
  },
  {
    id: "test_semantic_dodge",
    satisfies: "dodge",
    activation: "explicit",
    getOption: (context) => context.hero === "test-hero"
      ? { provider: "test_hero", providerId: "test_semantic_dodge", satisfies: "dodge", label: "Use test Dodge", cards: [], selection: null }
      : null,
    resolve: () => ({ status: "satisfied", providerId: "test_semantic_dodge", satisfies: "dodge" }),
  },
  {
    id: "test_semantic_negate",
    satisfies: "negate",
    activation: "explicit",
    getOption: (context) => context.hero === "test-hero"
      ? { provider: "test_hero", providerId: "test_semantic_negate", satisfies: "negate", label: "Use test Negate", cards: [], selection: null }
      : null,
    resolve: () => ({ status: "satisfied", providerId: "test_semantic_negate", satisfies: "negate" }),
  },
];

const continueTrigger = (id: string, event: "attack_dodged" | "damage_about_to_apply", marker: string, label: string): TriggeredEffect => ({
  id,
  event,
  getOption: (context) => hasMarker(context.sourceEquipment, marker) ? { effectId: id, label, selection: null } : null,
  resolve: () => ({ status: "resolved", effectId: id, outcome: { kind: "continue_event" } }),
});

export const testSemanticTriggers: TriggeredEffect[] = [
  continueTrigger("test_attack_dodged_a", "attack_dodged", "test-trigger-a", "Test attack reaction A"),
  continueTrigger("test_attack_dodged_b", "attack_dodged", "test-trigger-b", "Test attack reaction B"),
  continueTrigger("test_damage_about_to_apply_a", "damage_about_to_apply", "test-trigger-a", "Test damage reaction A"),
  continueTrigger("test_damage_about_to_apply_b", "damage_about_to_apply", "test-trigger-b", "Test damage reaction B"),
];
