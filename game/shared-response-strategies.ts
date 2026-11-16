import { STANDARD_HEROES } from "./heroes";
import type { GamePlayer } from "./model";
import type { SharedResponseWindowPending, ResponsePending, DyingPending } from "./pending";
import { distanceBetween, nextAliveSeat, playersInTurnOrder } from "./rules";
import { SHARED_RESPONSE_WINDOW_MS } from "./shared-response-window";

export function sharedResponsePriority<T extends GamePlayer>(players: T[], requesterId: string,
  mode: SharedResponseWindowPending["continuation"]["mode"], rescueStartSeat?: number): string[] {
  const requester = players.find((player) => player.id === requesterId && player.alive);
  if (!requester) return [];
  if (mode === "DYING_PEACH") return playersInTurnOrder(players.filter((player) => player.alive), rescueStartSeat ?? requester.seat).map((player) => player.id);
  const faction = mode === "ENTOURAGE_DODGE" ? "Wei" : "Shu";
  const forward = playersInTurnOrder(players, nextAliveSeat(players, requester.seat))
    .filter((player) => player.alive && player.id !== requesterId
      && STANDARD_HEROES.some((hero) => hero.id === player.hero && hero.faction === faction));
  const order = new Map(forward.map((player, index) => [player.id, index]));
  return (mode === "ENTOURAGE_DODGE" ? forward.sort((a, b) => distanceBetween(players, requesterId, a.id)
    - distanceBetween(players, requesterId, b.id) || order.get(a.id)! - order.get(b.id)!) : forward).map((player) => player.id);
}
export function createSharedResponseWindow<T extends GamePlayer>(players: T[], requesterId: string, targetId: string,
  continuation: SharedResponseWindowPending["continuation"], now = Date.now(), rescueStartSeat?: number): SharedResponseWindowPending | null {
  const priorityPlayerIds = sharedResponsePriority(players, requesterId, continuation.mode, rescueStartSeat);
  if (!priorityPlayerIds.length) return null;
  const original = continuation.mode === "DYING_PEACH" ? continuation.dying : continuation.response;
  return { kind: "shared_response_window", version: 1, windowId: crypto.randomUUID(), openedAt: now,
    deadline: now + SHARED_RESPONSE_WINDOW_MS, eligiblePlayerIds: [...priorityPlayerIds], priorityPlayerIds,
    requesterId, targetId, continuation, round: continuation.mode === "DYING_PEACH" ? (continuation.dying.sharedRescue?.round ?? 0) + 1 : 1,
    ...(original.causal ? { causal: original.causal } : {}) };
}
export function sharedResponseForPlayer(window: SharedResponseWindowPending, player: Pick<GamePlayer, "id" | "hero" | "alive">): ResponsePending | DyingPending | null {
  if (!player.alive || !window.eligiblePlayerIds.includes(player.id)) return null;
  const domain = window.continuation;
  if (domain.mode === "DYING_PEACH") return { ...domain.dying, actorId: player.id, remainingIds: [], deadline: window.deadline, sharedRescue: { round: window.round } };
  const entourage = domain.mode === "ENTOURAGE_DODGE" && player.hero
    ? { ...domain.invocation, helperActorId: player.id, helperHeroId: player.hero } : undefined;
  return { ...domain.response, actorId: player.id, deadline: window.deadline,
    delegation: { kind: domain.mode === "ENTOURAGE_DODGE" ? "dodge" : "attack", requesterId: window.requesterId,
      providerId: domain.mode === "ENTOURAGE_DODGE" ? "cao_cao_hujia" : "liu_bei_jijiang", remainingActorIds: [],
      ...(entourage ? { publicEntourage: entourage } : {}) } };
}
