import type { GamePlayer } from "./model";

function livingPlayers<T extends GamePlayer>(players: T[]) {
  return players.filter((player) => Boolean(player.alive)).sort((a, b) => a.seat - b.seat);
}

export function nextAliveSeat<T extends GamePlayer>(players: T[], seat: number) {
  const alive = livingPlayers(players);
  if (!alive.length) throw new Error("A playing match must have at least one living player.");
  const next = alive.find((player) => player.seat > seat) ?? alive[0];
  if (!next.alive) throw new Error("The next turn must belong to a living player.");
  return next.seat;
}

export function playersInTurnOrder<T extends GamePlayer>(players: T[], turnSeat: number) {
  const alive = livingPlayers(players);
  const exact = alive.findIndex((player) => player.seat === turnSeat);
  const following = alive.findIndex((player) => player.seat > turnSeat);
  const start = exact >= 0 ? exact : following >= 0 ? following : 0;
  return [...alive.slice(start), ...alive.slice(0, start)];
}

export function distanceBetween<T extends GamePlayer>(players: T[], sourceId: string, targetId: string) {
  const alive = livingPlayers(players);
  const from = alive.findIndex((player) => player.id === sourceId);
  const to = alive.findIndex((player) => player.id === targetId);
  if (from < 0 || to < 0) return 99;
  const clockwise = (to - from + alive.length) % alive.length;
  return Math.min(clockwise, alive.length - clockwise);
}

export function playPhaseAfterAttack(source?: GamePlayer | null, hasUnlimitedAttackEquipment = false) {
  return source?.hero === "zhang-fei" || hasUnlimitedAttackEquipment ? "play" : "play-struck";
}
