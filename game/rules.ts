import type { GamePlayer } from "./model";

function livingPlayers<T extends GamePlayer>(players: T[]) {
  return players.filter((player) => Boolean(player.alive)).sort((a, b) => a.seat - b.seat);
}

export function nextAliveSeat<T extends GamePlayer>(players: T[], seat: number) {
  const alive = livingPlayers(players);
  return alive.find((player) => player.seat > seat)?.seat ?? alive[0]?.seat ?? seat;
}

export function playersInTurnOrder<T extends GamePlayer>(players: T[], turnSeat: number) {
  const alive = livingPlayers(players);
  const start = Math.max(0, alive.findIndex((player) => player.seat === turnSeat));
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

export function playPhaseAfterAttack(source?: GamePlayer | null) {
  return source?.hero === "zhang-fei" ? "play" : "play-struck";
}
