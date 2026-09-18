import { isAttackCard } from "../../cards";
import type { ResponseProvider } from "../../responses";

/** Longdan: a Dodge may satisfy an Attack requirement. */
export const zhaoYunDodgeAsAttackProvider: ResponseProvider = {
  id: "zhao_yun_dodge_as_attack",
  satisfies: "attack",
  activation: "explicit",
  playPhaseUse: "attack",
  getOption: (context) => {
    if (context.hero !== "zhao-yun") return null;
    const cards = (context.hand ?? []).filter((card) => card.kind === "Dodge");
    return cards.length
      ? { provider: "zhao_yun", providerId: "zhao_yun_dodge_as_attack", satisfies: "attack", label: "Use Longdan as Attack", cards, playedAs: "attack", selection: { type: "cards", min: 1, max: 1, eligibleCardIds: cards.map((card) => card.id) } }
      : null;
  },
  resolve: (context) => {
    if (context.hero !== "zhao-yun") return null;
    const cardId = context.selection.cardId ?? (context.selection.cardIds?.length === 1 ? context.selection.cardIds[0] : "");
    const card = context.hand.find((item) => item.id === cardId && item.kind === "Dodge");
    return card ? { status: "satisfied", providerId: "zhao_yun_dodge_as_attack", satisfies: "attack", consumeCardIds: [card.id], resolution: "cards", playedAs: "attack" } : null;
  },
};

/** Longdan: a physical Attack may satisfy a Dodge requirement. */
export const zhaoYunAttackAsDodgeProvider: ResponseProvider = {
  id: "zhao_yun_attack_as_dodge",
  satisfies: "dodge",
  activation: "explicit",
  getOption: (context) => {
    if (context.hero !== "zhao-yun") return null;
    const cards = (context.hand ?? []).filter(isAttackCard);
    return cards.length
      ? { provider: "zhao_yun", providerId: "zhao_yun_attack_as_dodge", satisfies: "dodge", label: "Use Longdan as Dodge", cards, playedAs: "dodge", selection: { type: "cards", min: 1, max: 1, eligibleCardIds: cards.map((card) => card.id) } }
      : null;
  },
  resolve: (context) => {
    if (context.hero !== "zhao-yun") return null;
    const cardId = context.selection.cardId ?? (context.selection.cardIds?.length === 1 ? context.selection.cardIds[0] : "");
    const card = context.hand.find((item) => item.id === cardId && isAttackCard(item));
    return card ? { status: "satisfied", providerId: "zhao_yun_attack_as_dodge", satisfies: "dodge", consumeCardIds: [card.id], resolution: "cards", playedAs: "dodge" } : null;
  },
};
