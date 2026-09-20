import { HEROES } from "../../heroes";
import type { ResponseProvider } from "../../responses";

function factionFor(hero: string | null | undefined) {
  return HEROES.find((candidate) => candidate.id === hero)?.faction ?? null;
}

function delegatesFor(context: Parameters<ResponseProvider["getOption"]>[0], faction: string) {
  return (context.delegates ?? []).filter((candidate) => factionFor(candidate.hero) === faction);
}

/** Hujia asks another Wei character to provide the required Dodge. */
export const caoCaoHujiaProvider: ResponseProvider = {
  id: "cao_cao_hujia",
  satisfies: "dodge",
  activation: "explicit",
  getOption(context) {
    const delegates = context.hero === "cao-cao" ? delegatesFor(context, "Wei") : [];
    return delegates.length ? { provider: "cao_cao", providerId: "cao_cao_hujia", satisfies: "dodge", label: "Use Hujia — ask Wei", selection: null } : null;
  },
  resolve(context) {
    const delegates = context.hero === "cao-cao" ? delegatesFor(context, "Wei") : [];
    return delegates.length ? { status: "delegated", providerId: "cao_cao_hujia", satisfies: "dodge", delegateIds: delegates.map((delegate) => delegate.id) } : null;
  },
};

/** Jijiang asks another Shu character to provide the required Attack. */
export const liuBeiJijiangProvider: ResponseProvider = {
  id: "liu_bei_jijiang",
  satisfies: "attack",
  activation: "explicit",
  getOption(context) {
    const delegates = context.hero === "liu-bei" ? delegatesFor(context, "Shu") : [];
    return delegates.length ? { provider: "liu_bei", providerId: "liu_bei_jijiang", satisfies: "attack", label: "Use Jijiang — ask Shu", selection: null } : null;
  },
  resolve(context) {
    const delegates = context.hero === "liu-bei" ? delegatesFor(context, "Shu") : [];
    return delegates.length ? { status: "delegated", providerId: "liu_bei_jijiang", satisfies: "attack", delegateIds: delegates.map((delegate) => delegate.id) } : null;
  },
};
