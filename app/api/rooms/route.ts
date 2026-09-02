import { env } from "cloudflare:workers";
import { getRequestExecutionContext } from "vinext/shims/request-context";
import { cardDefinition, DECK_CARD_KINDS, isAttackCard, makeDeck } from "../../../game/cards";
import type { Card, CardKind, EquipmentZone } from "../../../game/model";
import { distanceBetween, nextAliveSeat, playPhaseAfterAttack, playersInTurnOrder } from "../../../game/rules";

export const runtime = "edge";

type AttackPending = { kind: "attack"; sourceId: string; targetId: string; actorId: string; resumePhase?: string; sequenceStartCardId?: string; reason: string; deadline?: number };
type GreenDragonPending = { kind: "green_dragon"; sourceId: string; targetId: string; actorId: string; resumePhase: string; sequenceStartCardId: string; reason: string; deadline?: number };
type RockCleavingPending = { kind: "rock_cleaving"; sourceId: string; targetId: string; actorId: string; resumePhase: string; sequenceStartCardId: string; reason: string; deadline?: number };
type DuelPending = { kind: "duel"; sourceId: string; targetId: string; actorId: string; opponentId: string; resumePhase: string; reason: string; deadline?: number };
type GroupPending = { kind: "group"; cardKind: "BarbarianInvasion" | "RainingArrows"; sourceId: string; actorId: string; remainingIds: string[]; requiredKind: "Attack" | "Dodge"; resumePhase: string; reason: string; deadline?: number; heldCards?: Card[] };
type HarvestChoice = { cardId: string; playerId: string; playerName: string };
type HarvestPending = { kind: "harvest"; sourceId: string; actorId: string; remainingIds: string[]; revealed: Card[]; availableIds?: string[]; choices?: HarvestChoice[]; previewCardId?: string; botAdvanceAt?: number; completeAt?: number; resumePhase: string; reason: string; heldCards?: Card[] };
type TargetCardZone = "hand" | "equipment" | "judgement";
type TargetCardPending = { kind: "target_card"; sourceId: string; actorId: string; targetId: string; cardKind: "Dismantle" | "Steal"; resumePhase: string; reason: string; heldCards?: Card[] };
type DeferredStratagem =
  | { kind: "draw_two"; cardId: string }
  | { kind: "oath" }
  | { kind: "harvest"; chooserIds: string[] }
  | { kind: "harvest_target"; pending: HarvestPending }
  | { kind: "dismantle"; targetId: string }
  | { kind: "steal"; targetId: string }
  | { kind: "duel"; pending: DuelPending }
  | { kind: "group"; pending: GroupPending }
  | { kind: "overindulgence"; targetId: string; cardId: string }
  | { kind: "lightning"; targetId: string; cardId: string }
  | { kind: "rations_depleted"; targetId: string; cardId: string }
  | { kind: "judgement"; targetId: string; cardId: string };
type NegationPending = { kind: "negation"; sourceId: string; actorId: string; remainingIds: string[]; negated: boolean; cardName: string; effectTargetId: string; resumePhase: string; effect: DeferredStratagem; reason: string; heldCards?: Card[]; deadline?: number };
type DyingPending = { kind: "dying"; sourceId: string | null; targetId: string; actorId: string; remainingIds: string[]; deadline: number; resumePlayerId: string; resumePhase?: string; resumePending?: GroupPending; reason: string };
type Pending = AttackPending | GreenDragonPending | RockCleavingPending | DuelPending | GroupPending | HarvestPending | TargetCardPending | NegationPending | DyingPending;
type RoomRow = { id: string; code: string; host_player_id: string; status: string; max_players: number; created_at: number; turn_seat: number | null; phase: string | null; deck_json: string | null; discard_json: string | null; log_json: string | null; pending_json: string | null };
type Hero = { id: string; name: string; faction: string; hp: number; ability: string };
type PlayerRow = { id: string; room_id: string; name: string; token_hash: string; seat: number; role: string | null; hero: string | null; hp: number | null; max_hp: number | null; hero_options_json: string | null; hand_json: string | null; judgement_json: string | null; equipment_json: string | null; alive: number; connected_at: number };

const HEROES: Hero[] = [
  { id: "cao-cao", name: "Cao Cao", faction: "Wei", hp: 4, ability: "After taking damage, you may gain the card that caused it." },
  { id: "simayi", name: "Sima Yi", faction: "Wei", hp: 3, ability: "After taking damage, you may take one card from the source." },
  { id: "xiahou-dun", name: "Xiahou Dun", faction: "Wei", hp: 4, ability: "After taking damage, judge: on red, the source discards or loses HP." },
  { id: "zhang-liao", name: "Zhang Liao", faction: "Wei", hp: 4, ability: "During draw, you may take cards from up to two players instead." },
  { id: "xu-chu", name: "Xu Chu", faction: "Wei", hp: 4, ability: "Draw one fewer card to make your Attack and Duel damage stronger." },
  { id: "guo-jia", name: "Guo Jia", faction: "Wei", hp: 3, ability: "After a judgement or damage, turn revealed cards into resources." },
  { id: "zhen-ji", name: "Zhen Ji", faction: "Wei", hp: 3, ability: "Black cards may be used as Dodge; black judgements can extend your draw." },
  { id: "liu-bei", name: "Liu Bei", faction: "Shu", hp: 4, ability: "Give cards to allies; after giving enough, recover 1 HP." },
  { id: "guan-yu", name: "Guan Yu", faction: "Shu", hp: 4, ability: "Any red card may be used as an Attack." },
  { id: "zhang-fei", name: "Zhang Fei", faction: "Shu", hp: 4, ability: "You may play any number of Attacks during your turn." },
  { id: "zhao-yun", name: "Zhao Yun", faction: "Shu", hp: 4, ability: "Attack and Dodge may be used interchangeably." },
  { id: "ma-chao", name: "Ma Chao", faction: "Shu", hp: 4, ability: "Your attack distance improves; judgement may make an Attack unavoidable." },
  { id: "huang-yueying", name: "Huang Yueying", faction: "Shu", hp: 3, ability: "After using a tactic, draw a card; equipment has no distance limit." },
  { id: "sun-quan", name: "Sun Quan", faction: "Wu", hp: 4, ability: "Once per turn, exchange any number of cards for new ones." },
  { id: "gan-ning", name: "Gan Ning", faction: "Wu", hp: 4, ability: "Any black card may be used to dismantle another player's card." },
  { id: "lü-meng", name: "Lü Meng", faction: "Wu", hp: 4, ability: "If you play no Attack, you may ignore the normal hand limit." },
  { id: "huang-gai", name: "Huang Gai", faction: "Wu", hp: 4, ability: "Lose 1 HP to draw two cards." },
  { id: "zhou-yu", name: "Zhou Yu", faction: "Wu", hp: 3, ability: "Draw an extra card; challenge a player to guess a card's suit." },
  { id: "daqiao", name: "Da Qiao", faction: "Wu", hp: 3, ability: "Diamond cards may delay another player's turn." },
  { id: "lu-xun", name: "Lu Xun", faction: "Wu", hp: 3, ability: "You resist delayed capture; draw when your hand becomes empty." },
  { id: "sun-shangxiang", name: "Sun Shangxiang", faction: "Wu", hp: 3, ability: "Draw when losing equipment; discard equipment to heal an injured ally." },
  { id: "hua-tuo", name: "Hua Tuo", faction: "Neutral", hp: 3, ability: "Red cards may heal others; discard a card to heal yourself once per turn." },
  { id: "lü-bu", name: "Lü Bu", faction: "Neutral", hp: 4, ability: "A target needs two Dodge cards to stop your Attack." },
  { id: "diao-chan", name: "Diao Chan", faction: "Neutral", hp: 3, ability: "Force two male heroes to duel; draw at the end of your turn." },
  { id: "huaxiong", name: "Hua Xiong", faction: "Neutral", hp: 6, ability: "High endurance, but red Attack damage can reward the attacker." },
  { id: "yuanshao", name: "Yuan Shao", faction: "Neutral", hp: 4, ability: "Two same-suit hand cards may become a volley against everyone." },
  { id: "yanliang-wenchou", name: "Yan Liang & Wen Chou", faction: "Neutral", hp: 4, ability: "A black card may launch a Duel." },
  { id: "pangde", name: "Pang De", faction: "Neutral", hp: 4, ability: "Improved attack distance; a dodged Attack can discard a target card." },
];
const ROLE_SETS: Record<number, string[]> = { 4: ["Lord", "Loyalist", "Rebel", "Renegade"], 5: ["Lord", "Loyalist", "Rebel", "Rebel", "Renegade"], 6: ["Lord", "Loyalist", "Rebel", "Rebel", "Rebel", "Renegade"], 7: ["Lord", "Loyalist", "Loyalist", "Rebel", "Rebel", "Rebel", "Renegade"], 8: ["Lord", "Loyalist", "Loyalist", "Rebel", "Rebel", "Rebel", "Rebel", "Renegade"] };

const json = (data: unknown, status = 200) => Response.json(data, { status, headers: { "Cache-Control": "no-store" } });
const publicRoleName = (role: string | null | undefined) => role === "Renegade" ? "Traitor" : role ?? null;
const HARVEST_BOT_THINK_MS = 450;
const HARVEST_CHOICE_HOLD_MS = 1400;
const RESPONSE_TIMEOUT_MS = 10_000;
const GAMEPLAY_ACTIONS = new Set(["draw", "play_card", "serpent_spear_attack", "end_turn", "discard_cards", "respond_dodge", "take_damage", "respond_green_dragon", "pass_green_dragon", "respond_rock_cleaving", "pass_rock_cleaving", "respond_duel", "take_duel_damage", "respond_group", "take_group_damage", "respond_negation", "pass_negation", "preview_harvest", "choose_harvest", "choose_target_card", "start_response_timer", "start_rescue_timer", "give_peach", "skip_rescue"]);

async function setup() {
  const db = env.DB;
  await db.batch([
    db.prepare("CREATE TABLE IF NOT EXISTS rooms (id TEXT PRIMARY KEY, code TEXT NOT NULL UNIQUE, host_player_id TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'lobby', max_players INTEGER NOT NULL DEFAULT 8, created_at INTEGER NOT NULL, turn_seat INTEGER, phase TEXT, deck_json TEXT, discard_json TEXT, log_json TEXT, pending_json TEXT)"),
    db.prepare("CREATE TABLE IF NOT EXISTS players (id TEXT PRIMARY KEY, room_id TEXT NOT NULL, name TEXT NOT NULL, token_hash TEXT NOT NULL, seat INTEGER NOT NULL, role TEXT, hero TEXT, hp INTEGER, max_hp INTEGER, hero_options_json TEXT, hand_json TEXT, judgement_json TEXT, equipment_json TEXT, alive INTEGER NOT NULL DEFAULT 1, connected_at INTEGER NOT NULL, UNIQUE(room_id, seat))"),
    db.prepare("CREATE INDEX IF NOT EXISTS idx_players_room_id ON players(room_id)"),
    db.prepare("CREATE TABLE IF NOT EXISTS game_audit (id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL, room_id TEXT NOT NULL, event_key TEXT, event_type TEXT NOT NULL, actor_id TEXT, actor_name TEXT, action TEXT, phase_before TEXT, phase_after TEXT, turn_seat_before INTEGER, turn_seat_after INTEGER, acting_player_before TEXT, acting_player_after TEXT, detail_json TEXT, created_at INTEGER NOT NULL)"),
    db.prepare("CREATE TABLE IF NOT EXISTS audit_scope (id INTEGER PRIMARY KEY NOT NULL, room_id TEXT NOT NULL)"),
    db.prepare("CREATE INDEX IF NOT EXISTS idx_game_audit_room_id ON game_audit(room_id, id)"),
    db.prepare("CREATE UNIQUE INDEX IF NOT EXISTS game_audit_room_event_unique ON game_audit(room_id, event_key)"),
    db.prepare("CREATE TRIGGER IF NOT EXISTS audit_room_transition AFTER UPDATE OF status, turn_seat, phase, pending_json, log_json ON rooms WHEN EXISTS (SELECT 1 FROM audit_scope WHERE id = 1 AND room_id = NEW.id) BEGIN INSERT INTO game_audit (room_id,event_type,phase_before,phase_after,turn_seat_before,turn_seat_after,acting_player_before,acting_player_after,detail_json,created_at) VALUES (OLD.id,'state_transition',OLD.phase,NEW.phase,OLD.turn_seat,NEW.turn_seat,CASE WHEN OLD.phase IN ('response','dying') THEN COALESCE(json_extract(OLD.pending_json,'$.actorId'),json_extract(OLD.pending_json,'$.targetId')) ELSE (SELECT id FROM players WHERE room_id=OLD.id AND seat=OLD.turn_seat) END,CASE WHEN NEW.phase IN ('response','dying') THEN COALESCE(json_extract(NEW.pending_json,'$.actorId'),json_extract(NEW.pending_json,'$.targetId')) ELSE (SELECT id FROM players WHERE room_id=NEW.id AND seat=NEW.turn_seat) END,json_object('statusBefore',OLD.status,'statusAfter',NEW.status,'pendingBefore',OLD.pending_json,'pendingAfter',NEW.pending_json),CAST(strftime('%s','now') AS INTEGER)*1000); END"),
    db.prepare("CREATE TRIGGER IF NOT EXISTS audit_new_game_events AFTER UPDATE OF log_json ON rooms WHEN EXISTS (SELECT 1 FROM audit_scope WHERE id = 1 AND room_id = NEW.id) BEGIN INSERT OR IGNORE INTO game_audit (room_id,event_key,event_type,actor_name,phase_after,turn_seat_after,acting_player_after,detail_json,created_at) SELECT NEW.id,CASE WHEN value LIKE '@event:%' THEN json_extract(substr(value,8),'$.id') WHEN value LIKE '@card:%' THEN json_extract(substr(value,7),'$.id') WHEN value LIKE '@history:%' THEN json_extract(substr(value,10),'$.id') ELSE 'legacy-'||hex(value) END,'game_event',CASE WHEN value LIKE '@card:%' THEN json_extract(substr(value,7),'$.player') ELSE NULL END,NEW.phase,NEW.turn_seat,CASE WHEN NEW.phase IN ('response','dying') THEN COALESCE(json_extract(NEW.pending_json,'$.actorId'),json_extract(NEW.pending_json,'$.targetId')) ELSE (SELECT id FROM players WHERE room_id=NEW.id AND seat=NEW.turn_seat) END,value,CAST(strftime('%s','now') AS INTEGER)*1000 FROM json_each(COALESCE(NEW.log_json,'[]')); END"),
  ]);
  const playerColumns = await db.prepare("PRAGMA table_info(players)").all<{ name: string }>();
  if (!(playerColumns.results ?? []).some((column) => column.name === "judgement_json")) await db.prepare("ALTER TABLE players ADD COLUMN judgement_json TEXT").run();
  if (!(playerColumns.results ?? []).some((column) => column.name === "equipment_json")) await db.prepare("ALTER TABLE players ADD COLUMN equipment_json TEXT").run();
}

async function recordAuditAction(room: RoomRow, actor: PlayerRow | null, actorName: string, action: string) {
  const scope = await env.DB.prepare("SELECT room_id FROM audit_scope WHERE id = 1").first<{ room_id: string }>();
  if (scope?.room_id !== room.id) return;
  const pending = parse<Pending | null>(room.pending_json, null);
  const actingPlayer = room.phase === "response" || room.phase === "dying"
    ? pending?.actorId ?? pending?.targetId ?? null
    : (await env.DB.prepare("SELECT id FROM players WHERE room_id = ? AND seat = ?").bind(room.id, room.turn_seat).first<{ id: string }>())?.id ?? null;
  await env.DB.prepare("INSERT INTO game_audit (room_id,event_type,actor_id,actor_name,action,phase_before,turn_seat_before,acting_player_before,detail_json,created_at) VALUES (?, 'action_submitted', ?, ?, ?, ?, ?, ?, ?, ?)")
    .bind(room.id, actor?.id ?? null, (actor?.name ?? actorName) || null, action, room.phase, room.turn_seat, actingPlayer, JSON.stringify({ submitted: true }), Date.now()).run();
}

function cleanName(value: unknown) { return String(value ?? "").trim().replace(/\s+/g, " ").slice(0, 20); }
function isBotPlayer(player?: PlayerRow | null) { return Boolean(player && (player.token_hash.startsWith("bot:") || player.name.startsWith("Test General "))); }
function randomCode() { const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; const bytes = crypto.getRandomValues(new Uint8Array(5)); return Array.from(bytes, (byte) => chars[byte % chars.length]).join(""); }
function newToken() { return Array.from(crypto.getRandomValues(new Uint8Array(24)), (byte) => byte.toString(16).padStart(2, "0")).join(""); }
async function hash(value: string) { const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value)); return Array.from(new Uint8Array(bytes), (byte) => byte.toString(16).padStart(2, "0")).join(""); }
function parse<T>(value: string | null, fallback: T): T { try { return value ? JSON.parse(value) as T : fallback; } catch { return fallback; } }
function equipmentZone(player?: PlayerRow | null) { return parse<EquipmentZone>(player?.equipment_json ?? null, {}); }
function equipmentCards(player?: PlayerRow | null) { return Object.values(equipmentZone(player)).filter((card): card is Card => Boolean(card)); }
function targetableCardCount(player?: PlayerRow | null) { return parse<Card[]>(player?.hand_json ?? null, []).length + equipmentCards(player).length + parse<Card[]>(player?.judgement_json ?? null, []).length; }
function weaponCard(player?: PlayerRow | null) { return equipmentZone(player).weapon; }
function attackRangeFor(player?: PlayerRow | null) { const weapon = weaponCard(player); return weapon ? cardDefinition(weapon.kind).attackRange ?? 1 : 1; }
function hasZhugeCrossbow(player?: PlayerRow | null) { return equipmentZone(player).weapon?.kind === "ZhugeCrossbow"; }
function hasGreenDragonBlade(player?: PlayerRow | null) { return equipmentZone(player).weapon?.kind === "GreenDragonBlade"; }
function hasSerpentSpear(player?: PlayerRow | null) { return equipmentZone(player).weapon?.kind === "SerpentSpear"; }
function hasRockCleavingAxe(player?: PlayerRow | null) { return equipmentZone(player).weapon?.kind === "RockCleavingAxe"; }
function selectedSerpentSpearCards(player: PlayerRow | null | undefined, hand: Card[], value: unknown) {
  if (!hasSerpentSpear(player) || !Array.isArray(value)) return [];
  const ids = value.map(String); if (ids.length !== 2 || new Set(ids).size !== 2) return [];
  return ids.map((id) => hand.find((card) => card.id === id)).filter((card): card is Card => Boolean(card));
}
function botSerpentSpearCards(player: PlayerRow | null | undefined, hand: Card[]) { return hasSerpentSpear(player) && hand.length >= 2 ? hand.slice(0, 2) : []; }
function rockCleavingCards(player: PlayerRow | null | undefined, hand: Card[]) { return [...hand, ...equipmentCards(player)]; }
function selectedRockCleavingCards(player: PlayerRow | null | undefined, hand: Card[], value: unknown) {
  if (!hasRockCleavingAxe(player) || !Array.isArray(value)) return [];
  const ids = value.map(String); if (ids.length !== 2 || new Set(ids).size !== 2) return [];
  const available = rockCleavingCards(player, hand);
  return ids.map((id) => available.find((card) => card.id === id)).filter((card): card is Card => Boolean(card));
}
function phaseAfterAttack(player?: PlayerRow | null) { return playPhaseAfterAttack(player, hasZhugeCrossbow(player)); }
function addLog(log: string[], message: string) { return [...log.slice(-199), `@event:${JSON.stringify({ id: crypto.randomUUID(), message })}`]; }
function addHistory(log: string[], message: string) { return [...log.slice(-199), `@history:${JSON.stringify({ id: crypto.randomUUID(), message })}`]; }
function addCardEvent(log: string[], player: string, card: Card, target = player, action: "play" | "equip" | "activate" | "discard" | "gain" | "reveal" = "play", presentation = true) { return [...log.slice(-199), `@card:${JSON.stringify({ id: crypto.randomUUID(), player, target, card, action, presentation })}`]; }
function addCardGroupEvent(log: string[], player: string, cards: Card[], action: "discard" | "reveal" | "play", presentation = true, target = player, message?: string) { return cards.length ? [...log.slice(-199), `@cards:${JSON.stringify({ id: crypto.randomUUID(), player, target, cards, action, presentation, ...(message ? { message } : {}) })}`] : log; }
function addDiscardEvent(log: string[], player: string, cards: Card[]) { return addCardGroupEvent(log, player, cards, "discard"); }
function drawCards(deck: Card[], discard: Card[], count: number, log: string[]) {
  const drawn: Card[] = [];
  while (drawn.length < count) {
    if (!deck.length) {
      if (!discard.length) break;
      deck = [...discard]; discard = [];
      for (let index = deck.length - 1; index > 0; index--) { const swap = Math.floor(Math.random() * (index + 1)); [deck[index], deck[swap]] = [deck[swap], deck[index]]; }
      log = addLog(log, "The discard pile is shuffled into a new draw deck.");
    }
    const card = deck.shift(); if (card) drawn.push(card);
  }
  return { deck, discard, drawn, log };
}
function drawPhaseFlags(phase?: string | null) {
  return { skipPlay: Boolean(phase?.includes("skip-play")), skipDraw: Boolean(phase?.includes("skip-draw")) };
}
function drawPhaseFor(skipPlay: boolean, skipDraw: boolean) {
  return skipPlay && skipDraw ? "draw-skip-play-skip-draw" : skipPlay ? "draw-skip-play" : skipDraw ? "draw-skip-draw" : "draw";
}
function resolveTurnJudgement(player: PlayerRow, players: PlayerRow[], deck: Card[], discard: Card[], log: string[]) {
  const delayedCards = parse<Card[]>(player.judgement_json, []);
  const delayed = delayedCards[0];
  const remaining = delayedCards.slice(1);
  let skipPlay = false;
  let skipDraw = false;
  let damage = 0;
  let transferTarget: PlayerRow | null = null;
  if (delayed) {
    const draw = drawCards(deck, discard, 1, log); deck = draw.deck; discard = draw.discard; log = draw.log;
    const judged = draw.drawn[0];
    if (judged) {
      log = addCardEvent(log, player.name, judged, player.name, "reveal");
      if (delayed.kind === "Overindulgence") {
        skipPlay = judged.suit !== "♥";
        log = addLog(log, `${player.name} judges ${judged.rank}${judged.suit} for Overindulgence. ${judged.suit === "♥" ? "The Heart result allows the Play Phase." : "The result is not a Heart, so the Play Phase is skipped."}`);
        discard.push(delayed);
      } else if (delayed.kind === "RationsDepleted") {
        skipDraw = judged.suit !== "♣";
        log = addLog(log, `${player.name} judges ${judged.rank}${judged.suit} for Rations Depleted. ${judged.suit === "♣" ? "The Club result allows the Draw Phase." : "The result is not a Club, so the Draw Phase is skipped."}`);
        discard.push(delayed);
      } else if (delayed.kind === "Lightning") {
        const numericRank = Number(judged.rank);
        const hit = judged.suit === "♠" && numericRank >= 2 && numericRank <= 9;
        if (hit) {
          damage = 3; discard.push(delayed);
          log = addLog(log, `${player.name} judges ${judged.rank}${judged.suit} for Lightning and takes 3 thunder damage.`);
        } else {
          transferTarget = playersInTurnOrder(players, player.seat).slice(1).find((candidate) => !parse<Card[]>(candidate.judgement_json, []).some((card) => card.kind === "Lightning")) ?? null;
          if (transferTarget) log = addLog(log, `${player.name} judges ${judged.rank}${judged.suit} for Lightning. Lightning misses and transfers to ${transferTarget.name}'s Judgement Zone.`);
          else { discard.push(delayed); log = addLog(log, `${player.name} judges ${judged.rank}${judged.suit} for Lightning. No eligible Judgement Zone remains, so Lightning is discarded.`); }
        }
      } else {
        discard.push(delayed);
      }
      discard.push(judged);
    } else log = addLog(log, `${player.name} has no card available for judgement.`);
  }
  return { deck, discard, log, skipPlay, skipDraw, damage, transferTarget, transferredCard: transferTarget ? delayed : null, remaining, resolved: Boolean(delayed) };
}
function messageEvent(entry: string, index: number) {
  if (!entry.startsWith("@event:")) return { type: "message" as const, id: `legacy-${index}-${entry}`, message: entry };
  try { return { type: "message" as const, ...JSON.parse(entry.slice(7)) as { id: string; message: string } }; } catch { return null; }
}
function gameTimeline(entries: string[]) {
  const events: Array<Record<string, unknown>> = [];
  for (let index = 0; index < entries.length; index++) {
    const entry = entries[index];
    if (entry.startsWith("@history:")) {
      try { events.push({ type: "message", presentation: false, ...JSON.parse(entry.slice(9)) as { id: string; message: string } }); } catch { /* Ignore malformed historical events. */ }
      continue;
    }
    if (entry.startsWith("@cards:")) {
      try { events.push({ type: "cards", ...JSON.parse(entry.slice(7)) as Record<string, unknown> }); } catch { /* Ignore malformed grouped-card events. */ }
      continue;
    }
    if (!entry.startsWith("@card:")) {
      const event = messageEvent(entry, index); if (event) events.push(event);
      continue;
    }
    try {
      const card = JSON.parse(entry.slice(6)) as Record<string, unknown>;
      events.push({ type: "card", ...card });
    } catch { /* Ignore malformed historical events. */ }
  }
  return events;
}
async function claimTurnAction(roomId: string, seat: number, phase: string) {
  const result = await db().prepare("UPDATE rooms SET phase = 'resolving' WHERE id = ? AND status = 'playing' AND turn_seat = ? AND phase = ?").bind(roomId, seat, phase).run();
  return (result.meta.changes ?? 0) > 0;
}
function groupSequenceFromPending(pending: Pending | null) {
  if (pending?.kind === "group") return pending;
  if (pending?.kind === "negation" && pending.effect.kind === "group") return { ...pending.effect.pending, heldCards: pending.heldCards ?? pending.effect.pending.heldCards } satisfies GroupPending;
  if (pending?.kind === "dying" && pending.resumePending) return pending.resumePending;
  return null;
}
function appendHeldGroupCard(pending: GroupPending, card: Card) {
  return { ...pending, heldCards: [...(pending.heldCards ?? []), card] } satisfies GroupPending;
}
function appendHeldGroupCards(pending: GroupPending, cards: Card[]) {
  return { ...pending, heldCards: [...(pending.heldCards ?? []), ...cards] } satisfies GroupPending;
}
function appendDyingSequenceCard(pending: DyingPending, card: Card) {
  return pending.resumePending ? { ...pending, resumePending: appendHeldGroupCard(pending.resumePending, card) } satisfies DyingPending : pending;
}
function commitHeldGroupCards(discard: Card[], pending: GroupPending) {
  const held = pending.heldCards ?? [];
  if (!held.length) return discard;
  const heldIds = new Set(held.map((card) => card.id));
  return [...discard.filter((card) => !heldIds.has(card.id)), ...held];
}
async function finishIfWon(roomId: string) {
  const rows = await db().prepare("SELECT * FROM players WHERE room_id = ? ORDER BY seat").bind(roomId).all<PlayerRow>(); const players = rows.results ?? []; const alive = players.filter((player) => player.alive); const lord = players.find((player) => player.role === "Lord");
  let winner = "";
  if (!lord?.alive) winner = alive.length === 1 && alive[0].role === "Renegade" ? "Traitor victory" : "Rebel victory";
  else if (!alive.some((player) => player.role === "Rebel" || player.role === "Renegade")) winner = "Lord and Loyalist victory";
  if (!winner) return false;
  const room = await db().prepare("SELECT log_json, discard_json, pending_json FROM rooms WHERE id = ?").bind(roomId).first<{ log_json: string | null; discard_json: string | null; pending_json: string | null }>();
  const sequence = groupSequenceFromPending(parse<Pending | null>(room?.pending_json ?? null, null));
  const discard = sequence ? commitHeldGroupCards(parse<Card[]>(room?.discard_json ?? null, []), sequence) : parse<Card[]>(room?.discard_json ?? null, []);
  const log = addLog(parse<string[]>(room?.log_json ?? null, []), `${winner}! The match is over.`);
  await db().prepare("UPDATE rooms SET status = 'finished', phase = 'finished', pending_json = NULL, discard_json = ?, log_json = ? WHERE id = ?").bind(JSON.stringify(discard), JSON.stringify(log), roomId).run(); return true;
}

async function beginMatch(roomId: string, players: PlayerRow[], guaranteedOpeningCards?: { playerId: string; kinds: CardKind[] }) {
  const deck = makeDeck();
  const openingHands = players.map((player) => ({ player, cards: deck.splice(0, 4) }));
  if (guaranteedOpeningCards) {
    const opening = openingHands.find(({ player }) => player.id === guaranteedOpeningCards.playerId);
    deck.push(...openingHands.flatMap(({ cards }) => cards));
    openingHands.forEach((entry) => { entry.cards = []; });
    for (const kind of guaranteedOpeningCards.kinds) {
      if (!opening) continue;
      const deckIndex = deck.findIndex((card) => card.kind === kind);
      if (deckIndex >= 0) opening.cards.push(...deck.splice(deckIndex, 1));
    }
    for (const entry of openingHands) if (entry !== opening) entry.cards.push(...deck.splice(0, 4));
  }
  const updates = openingHands.map(({ player, cards }) => db().prepare("UPDATE players SET hand_json = ?, judgement_json = '[]', equipment_json = '{}', alive = 1 WHERE id = ?").bind(JSON.stringify(cards), player.id));
  const lord = players.find((player) => player.role === "Lord") ?? players[0];
  await db().batch([...updates, db().prepare("UPDATE rooms SET status = 'playing', turn_seat = ?, phase = 'draw', deck_json = ?, discard_json = '[]', log_json = ? WHERE id = ?").bind(lord.seat, JSON.stringify(deck), JSON.stringify([`${lord.name} begins the match.`]), roomId)]);
}
async function beginRandomizedMatch(roomId: string, hostPlayerId: string) {
  const result = await db().prepare("SELECT * FROM players WHERE room_id = ? ORDER BY seat").bind(roomId).all<PlayerRow>();
  const players = result.results ?? [];
  const roles = [...ROLE_SETS[players.length]].sort(() => Math.random() - 0.5);
  const lordIndex = players.findIndex((player) => player.id === hostPlayerId); const lordAt = roles.indexOf("Lord");
  [roles[lordAt], roles[lordIndex]] = [roles[lordIndex], roles[lordAt]];
  const zhangFei = HEROES.find((hero) => hero.id === "zhang-fei")!;
  const otherHeroes = HEROES.filter((hero) => hero.id !== zhangFei.id).sort(() => Math.random() - 0.5);
  let otherHeroIndex = 0;
  const assigned = players.map((player, index) => {
    const hero = player.id === hostPlayerId ? zhangFei : otherHeroes[otherHeroIndex++];
    const hp = player.id === hostPlayerId ? hero.hp + 1 : 1;
    return { ...player, role: roles[index], hero: hero.id, hp, max_hp: hp, hero_options_json: JSON.stringify([hero]) };
  });
  await db().batch(assigned.map((player) => db().prepare("UPDATE players SET role = ?, hero = ?, hp = ?, max_hp = ?, hero_options_json = ? WHERE id = ?").bind(player.role, player.hero, player.hp, player.max_hp, player.hero_options_json, player.id)));
  await beginMatch(roomId, assigned, { playerId: hostPlayerId, kinds: DECK_CARD_KINDS });
  const quickPlayers = await db().prepare("SELECT * FROM players WHERE room_id = ? ORDER BY seat").bind(roomId).all<PlayerRow>();
  await db().batch((quickPlayers.results ?? []).filter((player) => player.id !== hostPlayerId).map((player, index) => {
    const hand = parse<Card[]>(player.hand_json, []); const testNegation: Card = { id: `quick-negation-${crypto.randomUUID()}`, kind: "Negation", suit: (["♣", "♠", "♦"] as const)[index % 3], rank: ["Q", "K", "J"][index % 3] };
    return db().prepare("UPDATE players SET hand_json = ? WHERE id = ?").bind(JSON.stringify([testNegation, ...hand.slice(1)]), player.id);
  }));
}
function db() { return env.DB; }

function playingStateIssue(room: RoomRow, players: PlayerRow[]) {
  if (room.status !== "playing") return null;
  const owner = players.find((player) => player.seat === room.turn_seat && player.alive);
  if (!owner) return "The active turn does not belong to a living player.";
  const pending = parse<Pending | null>(room.pending_json, null);
  if (room.phase === "response" || room.phase === "dying") {
    if (!pending) return `The ${room.phase} phase is missing its pending action.`;
    if (room.phase === "dying" && pending.kind !== "dying") return "The Dying phase contains the wrong pending action.";
    if (room.phase === "response" && pending.kind === "dying") return "The Response phase contains a Dying action.";
    const actor = players.find((player) => player.id === pending.actorId && player.alive);
    if (!actor) return "The pending action does not belong to a living player.";
    const expectedOwnerId = pending.kind === "dying" ? pending.resumePlayerId : pending.sourceId;
    if (owner.id !== expectedOwnerId) return "The pending action does not belong to the current turn owner.";
  } else if (room.phase !== "resolving" && pending) {
    return `The ${room.phase ?? "unknown"} phase contains an unexpected pending action.`;
  }
  return null;
}

async function continueInBackground(work: () => Promise<void>) {
  const context = getRequestExecutionContext();
  if (context) context.waitUntil(Promise.resolve().then(work));
  else await work();
}

async function resetAudit(roomId: string) {
  await db().batch([
    db().prepare("DELETE FROM game_audit"),
    db().prepare("DELETE FROM sqlite_sequence WHERE name = 'game_audit'"),
    db().prepare("INSERT INTO audit_scope (id, room_id) VALUES (1, ?) ON CONFLICT(id) DO UPDATE SET room_id = excluded.room_id").bind(roomId),
  ]);
}

async function continueAfterDying(roomId: string, sourceId: string) {
  if (await finishIfWon(roomId)) return;
  const source = await db().prepare("SELECT * FROM players WHERE id = ?").bind(sourceId).first<PlayerRow>();
  if (!isBotPlayer(source)) return;
  const room = await db().prepare("SELECT * FROM rooms WHERE id = ?").bind(roomId).first<RoomRow>();
  if (!room || room.status !== "playing") return;
  if (room.turn_seat === source.seat && room.phase === "play" && (source.hero === "zhang-fei" || hasZhugeCrossbow(source))) {
    await runBots(roomId);
    return;
  }
  const sourceHand = parse<Card[]>(source?.hand_json ?? null, []); const discard = parse<Card[]>(room.discard_json, []); let log = parse<string[]>(room.log_json, []); const discarded: Card[] = [];
  while (sourceHand.length > Math.max(0, source?.hp ?? 0)) { const card = sourceHand.shift(); if (card) { discard.push(card); discarded.push(card); } }
  if (discarded.length) { log = addDiscardEvent(log, source!.name, discarded); log = addLog(log, `${source!.name} discards ${discarded.length} card${discarded.length === 1 ? "" : "s"} to meet the hand limit.`); }
  const rows = await db().prepare("SELECT * FROM players WHERE room_id = ? ORDER BY seat").bind(roomId).all<PlayerRow>(); const next = nextAliveSeat(rows.results ?? [], source!.seat);
  log = addLog(log, `${source!.name} completes Discard and Ending; their turn ends.`);
  await db().batch([db().prepare("UPDATE players SET hand_json = ? WHERE id = ?").bind(JSON.stringify(sourceHand), source!.id), db().prepare("UPDATE rooms SET turn_seat = ?, phase = 'draw', discard_json = ?, log_json = ? WHERE id = ?").bind(next, JSON.stringify(discard), JSON.stringify(log), roomId)]);
  await runBots(roomId);
}

function dyingResumeState(pending: DyingPending, resume?: PlayerRow | null) {
  return pending.resumePending
    ? { phase: "response", pendingJson: JSON.stringify(pending.resumePending) }
    : { phase: pending.resumePhase ?? phaseAfterAttack(resume), pendingJson: null };
}

async function continueDyingResolution(roomId: string, pending: DyingPending) {
  if (await finishIfWon(roomId)) return;
  if (pending.resumePending) await advanceGroup(roomId);
  else if (pending.resumePhase?.startsWith("draw")) await runBots(roomId);
  else await continueAfterDying(roomId, pending.resumePlayerId);
}

async function defeatDyingPlayer(room: RoomRow, pending: DyingPending, target?: PlayerRow | null, source?: PlayerRow | null) {
  let deck = parse<Card[]>(room.deck_json, []); let discard = parse<Card[]>(room.discard_json, []); let log = addLog(parse<string[]>(room.log_json, []), `${target?.name ?? "The dying player"} receives no Peach and is defeated.`);
  const resume = await db().prepare("SELECT * FROM players WHERE id = ?").bind(pending.resumePlayerId).first<PlayerRow>();
  if (target?.role) log = addLog(log, `${target.name}'s role is revealed: ${publicRoleName(target.role)}.`);
  const defeatedHand = parse<Card[]>(target?.hand_json ?? null, []);
  const defeatedJudgement = parse<Card[]>(target?.judgement_json ?? null, []);
  const defeatedEquipment = equipmentCards(target);
  if (defeatedHand.length) {
    discard.push(...defeatedHand);
    log = addDiscardEvent(log, target?.name ?? "The defeated player", defeatedHand);
    log = addLog(log, `${target?.name ?? "The defeated player"} discards all remaining cards after being defeated.`);
  }
  if (defeatedJudgement.length) {
    discard.push(...defeatedJudgement);
    log = addCardGroupEvent(log, target?.name ?? "The defeated player", defeatedJudgement, "discard");
  }
  if (defeatedEquipment.length) {
    discard.push(...defeatedEquipment);
    log = addCardGroupEvent(log, target?.name ?? "The defeated player", defeatedEquipment, "discard");
  }
  const writes = [env.DB.prepare("UPDATE players SET hp = 0, alive = 0, hand_json = '[]', judgement_json = '[]', equipment_json = '{}' WHERE id = ?").bind(pending.targetId)];
  if (target?.role === "Rebel" && source?.alive) {
    const reward = drawCards(deck, discard, 3, log); deck = reward.deck; discard = reward.discard; log = reward.log;
    const sourceHand = [...parse<Card[]>(source.hand_json, []), ...reward.drawn];
    writes.push(env.DB.prepare("UPDATE players SET hand_json = ? WHERE id = ?").bind(JSON.stringify(sourceHand), source.id));
    log = addLog(log, `${source.name} defeated Rebel ${target.name} and draws ${reward.drawn.length} reward card${reward.drawn.length === 1 ? "" : "s"}.`);
  } else if (target?.role === "Loyalist" && source?.role === "Lord") {
    const lordHand = parse<Card[]>(source.hand_json, []);
    const lordEquipment = equipmentCards(source);
    if (lordHand.length) {
      discard.push(...lordHand);
      log = addDiscardEvent(log, source.name, lordHand);
    }
    if (lordEquipment.length) {
      discard.push(...lordEquipment);
      log = addCardGroupEvent(log, source.name, lordEquipment, "discard");
    }
    writes.push(env.DB.prepare("UPDATE players SET hand_json = '[]', equipment_json = '{}' WHERE id = ?").bind(source.id));
    log = addLog(log, `${source.name} defeated Loyalist ${target.name} and discards all cards as the Lord's penalty.`);
  }
  const next = dyingResumeState(pending, resume);
  let nextTurnSeat: number | null = null;
  if (!source && target && pending.resumePhase?.startsWith("draw")) {
    const rows = await db().prepare("SELECT * FROM players WHERE room_id = ? ORDER BY seat").bind(room.id).all<PlayerRow>();
    const afterDefeat = (rows.results ?? []).map((player) => player.id === target.id ? { ...player, alive: 0 } : player);
    nextTurnSeat = nextAliveSeat(afterDefeat, target.seat);
  }
  writes.push(env.DB.prepare("UPDATE rooms SET turn_seat = COALESCE(?, turn_seat), phase = ?, pending_json = ?, deck_json = ?, discard_json = ?, log_json = ? WHERE id = ?").bind(nextTurnSeat, next.phase, next.pendingJson, JSON.stringify(deck), JSON.stringify(discard), JSON.stringify(log), room.id));
  await env.DB.batch(writes);
  if (!source && pending.resumePhase?.startsWith("draw")) { if (!await finishIfWon(room.id)) await runBots(room.id); return; }
  await continueDyingResolution(room.id, pending);
}

async function advanceDyingRescue(roomId: string) {
  for (let guard = 0; guard < 12; guard++) {
    const room = await db().prepare("SELECT * FROM rooms WHERE id = ?").bind(roomId).first<RoomRow>();
    const pending = parse<Pending | null>(room?.pending_json ?? null, null);
    if (!room || room.phase !== "dying" || pending?.kind !== "dying") return;
    const rows = await db().prepare("SELECT * FROM players WHERE room_id = ? ORDER BY seat").bind(roomId).all<PlayerRow>(); const players = rows.results ?? [];
    const actor = players.find((player) => player.id === pending.actorId && player.alive); const target = players.find((player) => player.id === pending.targetId); const source = players.find((player) => player.id === pending.sourceId); const resume = players.find((player) => player.id === pending.resumePlayerId);
    const hand = parse<Card[]>(actor?.hand_json ?? null, []); const peach = hand.find((card) => card.kind === "Peach");
    if (actor && peach && !isBotPlayer(actor)) return;
    if (actor && peach) {
      const claimed = await db().prepare("UPDATE rooms SET phase = 'resolving' WHERE id = ? AND phase = 'dying' AND pending_json = ?").bind(roomId, room.pending_json).run();
      if ((claimed.meta.changes ?? 0) <= 0) continue;
      const nextHand = hand.filter((card) => card.id !== peach.id); const resumedPending = appendDyingSequenceCard(pending, peach); const discard = pending.resumePending ? parse<Card[]>(room.discard_json, []) : [...parse<Card[]>(room.discard_json, []), peach]; let log = parse<string[]>(room.log_json, []);
      log = addCardEvent(log, actor.name, peach, target?.name ?? "the dying player"); log = addLog(log, `${actor.name} gives Peach to ${target?.name ?? "the dying player"}, restoring them to 1 HP.`);
      const next = dyingResumeState(resumedPending, resume);
      await db().batch([db().prepare("UPDATE players SET hand_json = ? WHERE id = ?").bind(JSON.stringify(nextHand), actor.id), db().prepare("UPDATE players SET hp = 1, alive = 1 WHERE id = ?").bind(pending.targetId), db().prepare("UPDATE rooms SET phase = ?, pending_json = ?, discard_json = ?, log_json = ? WHERE id = ?").bind(next.phase, next.pendingJson, JSON.stringify(discard), JSON.stringify(log), roomId)]);
      await continueDyingResolution(roomId, resumedPending); return;
    }
    const nextId = pending.remainingIds?.[0];
    if (nextId) {
      const nextPending: DyingPending = { ...pending, actorId: nextId, remainingIds: pending.remainingIds.slice(1), deadline: 0, reason: `Decide whether to give Peach to ${target?.name ?? "the dying player"}` };
      const moved = await db().prepare("UPDATE rooms SET pending_json = ? WHERE id = ? AND phase = 'dying' AND pending_json = ?").bind(JSON.stringify(nextPending), roomId, room.pending_json).run();
      if ((moved.meta.changes ?? 0) > 0) continue;
      continue;
    }
    const claimed = await db().prepare("UPDATE rooms SET phase = 'resolving' WHERE id = ? AND phase = 'dying' AND pending_json = ?").bind(roomId, room.pending_json).run();
    if ((claimed.meta.changes ?? 0) <= 0) continue;
    await defeatDyingPlayer(room, pending, target, source); return;
  }
}

async function expireDyingRescue(roomId: string) {
  const room = await db().prepare("SELECT * FROM rooms WHERE id = ?").bind(roomId).first<RoomRow>(); const pending = parse<Pending | null>(room?.pending_json ?? null, null);
  if (!room || room.phase !== "dying" || pending?.kind !== "dying" || pending.deadline <= 0 || pending.deadline > Date.now()) return;
  const claimed = await db().prepare("UPDATE rooms SET phase = 'resolving' WHERE id = ? AND phase = 'dying' AND pending_json = ?").bind(roomId, room.pending_json).run(); if ((claimed.meta.changes ?? 0) <= 0) return;
  const target = await db().prepare("SELECT * FROM players WHERE id = ?").bind(pending.targetId).first<PlayerRow>(); const source = await db().prepare("SELECT * FROM players WHERE id = ?").bind(pending.sourceId).first<PlayerRow>();
  if (pending.remainingIds[0]) {
    const nextPending: DyingPending = { ...pending, actorId: pending.remainingIds[0], remainingIds: pending.remainingIds.slice(1), deadline: 0, reason: `Decide whether to give Peach to ${target?.name ?? "the dying player"}` };
    await db().prepare("UPDATE rooms SET phase = 'dying', pending_json = ? WHERE id = ? AND phase = 'resolving'").bind(JSON.stringify(nextPending), roomId).run(); await advanceDyingRescue(roomId);
  } else {
    await defeatDyingPlayer(room, pending, target, source);
  }
}

async function startDyingRescue(room: RoomRow, source: PlayerRow | null, target: PlayerRow, players: PlayerRow[], deck: Card[], discard: Card[], log: string[], extraWrites: D1PreparedStatement[] = [], resumePlayer: PlayerRow = source ?? target, resumePhase = source ? phaseAfterAttack(source) : "draw", resumePending?: GroupPending) {
  const order = playersInTurnOrder(players, room.turn_seat ?? source?.seat ?? target.seat); const first = order[0];
  const pending: DyingPending = { kind: "dying", sourceId: source?.id ?? null, targetId: target.id, actorId: first?.id ?? target.id, remainingIds: order.slice(1).map((player) => player.id), deadline: 0, resumePlayerId: resumePlayer.id, resumePhase, resumePending, reason: `Decide whether to give Peach to ${target.name}` };
  await db().batch([...extraWrites, db().prepare("UPDATE players SET hp = 0, alive = 1 WHERE id = ?").bind(target.id), db().prepare("UPDATE rooms SET phase = 'dying', pending_json = ?, deck_json = ?, discard_json = ?, log_json = ? WHERE id = ?").bind(JSON.stringify(pending), JSON.stringify(deck), JSON.stringify(discard), JSON.stringify(log), room.id)]);
  await advanceDyingRescue(room.id);
}

async function resolveDuelLoss(room: RoomRow, pending: DuelPending, loser: PlayerRow, opponent: PlayerRow, discard: Card[], log: string[]) {
  const resume = await db().prepare("SELECT * FROM players WHERE id = ?").bind(pending.sourceId).first<PlayerRow>();
  if (!resume) return;
  const hp = Math.max(0, (loser.hp ?? 1) - 1);
  if (hp === 0) {
    const rows = await db().prepare("SELECT * FROM players WHERE room_id = ? ORDER BY seat").bind(room.id).all<PlayerRow>();
    log = addLog(log, `${loser.name} fails to play Attack, takes 1 Duel damage from ${opponent.name}, and enters Dying. Peach rescue begins in turn order.`);
    await startDyingRescue(room, opponent, loser, rows.results ?? [], parse<Card[]>(room.deck_json, []), discard, log, [], resume, pending.resumePhase);
    return;
  }
  log = addLog(log, `${loser.name} fails to play Attack and takes 1 Duel damage from ${opponent.name}. Action returns to ${resume.name}.`);
  await db().batch([
    db().prepare("UPDATE players SET hp = ? WHERE id = ?").bind(hp, loser.id),
    db().prepare("UPDATE rooms SET phase = ?, pending_json = NULL, discard_json = ?, log_json = ? WHERE id = ?").bind(pending.resumePhase, JSON.stringify(discard), JSON.stringify(log), room.id),
  ]);
  await continueAfterDying(room.id, resume.id);
}

function playersHoldingNegation(players: PlayerRow[], startSeat: number) {
  return playersInTurnOrder(players, startSeat).filter((player) => parse<Card[]>(player.hand_json, []).some((card) => card.kind === "Negation"));
}

async function startJudgementNegation(room: RoomRow, target: PlayerRow, players: PlayerRow[], delayed: Card, deck: Card[], discard: Card[], log: string[]) {
  const holders = playersHoldingNegation(players, target.seat);
  if (!holders.length) return false;
  log = addCardEvent(log, target.name, delayed, target.name, "activate");
  const pending: NegationPending = { kind: "negation", sourceId: target.id, actorId: holders[0].id, remainingIds: holders.slice(1).map((player) => player.id), negated: false, cardName: cardDefinition(delayed.kind).name, effectTargetId: target.id, resumePhase: room.phase?.startsWith("draw") ? room.phase : "draw", effect: { kind: "judgement", targetId: target.id, cardId: delayed.id }, reason: `Play Negation to cancel ${cardDefinition(delayed.kind).name}'s effect on ${target.name}, or pass` };
  await db().prepare("UPDATE rooms SET phase = 'response', pending_json = ?, deck_json = ?, discard_json = ?, log_json = ? WHERE id = ?").bind(JSON.stringify(pending), JSON.stringify(deck), JSON.stringify(discard), JSON.stringify(log), room.id).run();
  await advanceNegation(room.id);
  return true;
}

async function resolveDeferredStratagem(roomId: string, pending: NegationPending): Promise<Card[]> {
  const room = await db().prepare("SELECT * FROM rooms WHERE id = ?").bind(roomId).first<RoomRow>();
  if (!room) return [];
  const rows = await db().prepare("SELECT * FROM players WHERE room_id = ? ORDER BY seat").bind(roomId).all<PlayerRow>();
  const players = rows.results ?? []; const source = players.find((player) => player.id === pending.sourceId);
  let deck = parse<Card[]>(room.deck_json, []); let discard = parse<Card[]>(room.discard_json, []); let log = parse<string[]>(room.log_json, []);
  const heldCards = pending.heldCards ?? [];
  if (pending.negated) {
    const target = players.find((player) => player.id === pending.effectTargetId);
    log = addLog(log, `${pending.cardName}'s effect on ${target?.name ?? "its target"} is cancelled by Negation.`);
    if (pending.effect.kind === "harvest_target") {
      const harvest = { ...pending.effect.pending, heldCards: pending.heldCards ?? pending.effect.pending.heldCards } satisfies HarvestPending;
      const next = nextHarvestPending(harvest, players);
      if (next) await beginHarvestTarget(room, next, players, deck, discard, log);
      else await queueHarvestCompletion(room, harvest, deck, discard, log);
      return [];
    }
    if (pending.effect.kind === "judgement") {
      const judgement = parse<Card[]>(target?.judgement_json ?? null, []); const delayed = judgement.find((card) => card.id === pending.effect.cardId);
      if (delayed) discard.push(delayed);
      discard.push(...heldCards);
      await db().batch([db().prepare("UPDATE players SET judgement_json = ? WHERE id = ?").bind(JSON.stringify(judgement.filter((card) => card.id !== pending.effect.cardId)), pending.effect.targetId), db().prepare("UPDATE rooms SET phase = ?, pending_json = NULL, discard_json = ?, log_json = ? WHERE id = ?").bind(pending.resumePhase, JSON.stringify(discard), JSON.stringify(log), roomId)]);
      if (isBotPlayer(target)) await runBots(roomId);
      return [];
    }
    if (pending.effect.kind === "group") {
      const group = { ...pending.effect.pending, heldCards: pending.heldCards ?? pending.effect.pending.heldCards } satisfies GroupPending;
      await finishGroupStep(room, group, players, discard, log);
      return [];
    }
    discard.push(...heldCards);
    await db().prepare("UPDATE rooms SET phase = ?, pending_json = NULL, discard_json = ?, log_json = ? WHERE id = ?").bind(pending.resumePhase, JSON.stringify(discard), JSON.stringify(log), roomId).run();
    if (source) await continueAfterDying(roomId, source.id);
    return [];
  }
  if (pending.effect.kind === "harvest_target") {
    const harvest = { ...pending.effect.pending, heldCards: pending.heldCards ?? pending.effect.pending.heldCards, botAdvanceAt: isBotPlayer(players.find((player) => player.id === pending.effect.pending.actorId)) ? Date.now() + HARVEST_BOT_THINK_MS : undefined } satisfies HarvestPending;
    await db().prepare("UPDATE rooms SET phase = 'response', pending_json = ?, deck_json = ?, discard_json = ?, log_json = ? WHERE id = ?").bind(JSON.stringify(harvest), JSON.stringify(deck), JSON.stringify(discard), JSON.stringify(log), roomId).run();
    await advanceHarvest(roomId);
    return [];
  }
  if (!source) return [];
  if (pending.effect.kind === "draw_two") {
    const playedIndex = discard.findIndex((card) => card.id === pending.effect.cardId); const played = playedIndex >= 0 ? discard.splice(playedIndex, 1)[0] : null;
    const draw = drawCards(deck, discard, 2, log); deck = draw.deck; discard = draw.discard; if (played) discard.push(played); log = addHistory(draw.log, `${source.name} plays Something Out of Nothing and draws ${draw.drawn.length} cards.`);
    const hand = [...parse<Card[]>(source.hand_json, []), ...draw.drawn];
    await db().batch([db().prepare("UPDATE players SET hand_json = ? WHERE id = ?").bind(JSON.stringify(hand), source.id), db().prepare("UPDATE rooms SET phase = ?, pending_json = NULL, deck_json = ?, discard_json = ?, log_json = ? WHERE id = ?").bind(pending.resumePhase, JSON.stringify(deck), JSON.stringify(discard), JSON.stringify(log), roomId)]);
    if (source) await continueAfterDying(roomId, source.id);
    return draw.drawn;
  } else if (pending.effect.kind === "oath") {
    const wounded = players.filter((player) => player.alive && (player.hp ?? 0) < (player.max_hp ?? 0));
    log = addLog(log, wounded.length ? `${wounded.map((player) => player.name).join(", ")} recover 1 HP.` : "No character is wounded, so nobody recovers HP.");
    await db().batch([...wounded.map((player) => db().prepare("UPDATE players SET hp = ? WHERE id = ?").bind(Math.min(player.max_hp ?? 0, (player.hp ?? 0) + 1), player.id)), db().prepare("UPDATE rooms SET phase = ?, pending_json = NULL, log_json = ? WHERE id = ?").bind(pending.resumePhase, JSON.stringify(log), roomId)]);
  } else if (pending.effect.kind === "dismantle" || pending.effect.kind === "steal") {
    const target = players.find((player) => player.id === pending.effect.targetId && player.alive);
    if (!target || targetableCardCount(target) === 0) {
      log = addLog(log, `${pending.cardName} has no valid card left to affect.`);
      discard.push(...heldCards);
      await db().prepare("UPDATE rooms SET phase = ?, pending_json = NULL, discard_json = ?, log_json = ? WHERE id = ?").bind(pending.resumePhase, JSON.stringify(discard), JSON.stringify(log), roomId).run();
    } else {
      const next: TargetCardPending = { kind: "target_card", sourceId: source.id, actorId: source.id, targetId: target.id, cardKind: pending.effect.kind === "dismantle" ? "Dismantle" : "Steal", resumePhase: pending.resumePhase, reason: `Choose 1 current card from ${target.name} for ${pending.cardName}`, heldCards };
      await db().prepare("UPDATE rooms SET phase = 'response', pending_json = ?, log_json = ? WHERE id = ?").bind(JSON.stringify(next), JSON.stringify(log), roomId).run();
    }
  } else if (pending.effect.kind === "overindulgence" || pending.effect.kind === "lightning" || pending.effect.kind === "rations_depleted") {
    const target = players.find((player) => player.id === pending.effect.targetId && player.alive);
    const playedIndex = discard.findIndex((card) => card.id === pending.effect.cardId); const played = playedIndex >= 0 ? discard.splice(playedIndex, 1)[0] : null;
    if (!target || !played) {
      if (played) discard.push(played);
      log = addLog(log, `${pending.cardName} no longer has a valid target.`);
      await db().prepare("UPDATE rooms SET phase = ?, pending_json = NULL, discard_json = ?, log_json = ? WHERE id = ?").bind(pending.resumePhase, JSON.stringify(discard), JSON.stringify(log), roomId).run();
    } else {
      const judgement = [...parse<Card[]>(target.judgement_json, []), played];
      log = addLog(log, `${played.rank}${played.suit} ${pending.cardName} is placed in ${target.name}'s Judgement Zone.`);
      await db().batch([db().prepare("UPDATE players SET judgement_json = ? WHERE id = ?").bind(JSON.stringify(judgement), target.id), db().prepare("UPDATE rooms SET phase = ?, pending_json = NULL, discard_json = ?, log_json = ? WHERE id = ?").bind(pending.resumePhase, JSON.stringify(discard), JSON.stringify(log), roomId)]);
    }
  } else if (pending.effect.kind === "judgement") {
    const target = players.find((player) => player.id === pending.effect.targetId && player.alive);
    if (!target) return [];
    const judgement = resolveTurnJudgement(target, players, deck, discard, log); deck = judgement.deck; discard = judgement.discard; log = judgement.log;
    const writes = [db().prepare("UPDATE players SET judgement_json = ? WHERE id = ?").bind(JSON.stringify(judgement.remaining), target.id)];
    if (judgement.transferTarget && judgement.transferredCard) {
      const transferred = [...parse<Card[]>(judgement.transferTarget.judgement_json, []), judgement.transferredCard];
      writes.push(db().prepare("UPDATE players SET judgement_json = ? WHERE id = ?").bind(JSON.stringify(transferred), judgement.transferTarget.id));
    }
    const priorFlags = drawPhaseFlags(pending.resumePhase);
    const nextPhase = drawPhaseFor(judgement.skipPlay || priorFlags.skipPlay, judgement.skipDraw || priorFlags.skipDraw);
    if (judgement.damage > 0) {
      const hp = Math.max(0, (target.hp ?? 1) - judgement.damage);
      if (hp === 0) {
        log = addLog(log, `${target.name} enters Dying from Lightning. Peach rescue begins in turn order.`);
        await startDyingRescue(room, null, target, players, deck, discard, log, writes, target, nextPhase);
        return [];
      }
      writes.push(db().prepare("UPDATE players SET hp = ? WHERE id = ?").bind(hp, target.id));
    }
    writes.push(db().prepare("UPDATE rooms SET phase = ?, pending_json = NULL, deck_json = ?, discard_json = ?, log_json = ? WHERE id = ?").bind(nextPhase, JSON.stringify(deck), JSON.stringify(discard), JSON.stringify(log), roomId));
    await db().batch(writes);
    if (isBotPlayer(target)) await runBots(roomId);
    return [];
  } else if (pending.effect.kind === "duel") {
    await db().prepare("UPDATE rooms SET phase = 'response', pending_json = ?, log_json = ? WHERE id = ?").bind(JSON.stringify(pending.effect.pending), JSON.stringify(log), roomId).run();
    await advanceDuel(roomId); return [];
  } else if (pending.effect.kind === "group") {
    const group = { ...pending.effect.pending, heldCards: pending.heldCards ?? pending.effect.pending.heldCards } satisfies GroupPending;
    await db().prepare("UPDATE rooms SET phase = 'response', pending_json = ?, log_json = ? WHERE id = ?").bind(JSON.stringify(group), JSON.stringify(log), roomId).run();
    await advanceGroup(roomId); return [];
  } else if (pending.effect.kind === "harvest") {
    const choosers = pending.effect.chooserIds.map((id) => players.find((player) => player.id === id)).filter((player): player is PlayerRow => Boolean(player?.alive));
    const draw = drawCards(deck, discard, choosers.length, log); deck = draw.deck; discard = draw.discard; log = addCardGroupEvent(draw.log, source.name, draw.drawn, "reveal", false);
    log = addHistory(log, `${source.name} reveals ${draw.drawn.length} card${draw.drawn.length === 1 ? "" : "s"} for Bumper Harvest. ${choosers[0]?.name ?? "No player"} chooses first.`);
    if (!choosers.length || !draw.drawn.length) await db().prepare("UPDATE rooms SET phase = ?, pending_json = NULL, deck_json = ?, discard_json = ?, log_json = ? WHERE id = ?").bind(pending.resumePhase, JSON.stringify(deck), JSON.stringify(discard), JSON.stringify(log), roomId).run();
    else {
      const harvest: HarvestPending = { kind: "harvest", sourceId: source.id, actorId: choosers[0].id, remainingIds: choosers.slice(1).map((player) => player.id), revealed: draw.drawn, availableIds: draw.drawn.map((card) => card.id), choices: [], botAdvanceAt: isBotPlayer(choosers[0]) ? Date.now() + HARVEST_BOT_THINK_MS : undefined, resumePhase: pending.resumePhase, reason: "Choose 1 revealed card from Bumper Harvest" };
      await db().prepare("UPDATE rooms SET phase = 'response', pending_json = ?, deck_json = ?, discard_json = ?, log_json = ? WHERE id = ?").bind(JSON.stringify(harvest), JSON.stringify(deck), JSON.stringify(discard), JSON.stringify(log), roomId).run(); await advanceHarvest(roomId); return [];
    }
  }
  if (source) await continueAfterDying(roomId, source.id);
  return [];
}

async function advanceNegation(roomId: string) {
  for (let guard = 0; guard < 16; guard++) {
    const room = await db().prepare("SELECT * FROM rooms WHERE id = ?").bind(roomId).first<RoomRow>(); const pending = parse<Pending | null>(room?.pending_json ?? null, null);
    if (!room || room.phase !== "response" || pending?.kind !== "negation") return;
    const actor = await db().prepare("SELECT * FROM players WHERE id = ?").bind(pending.actorId).first<PlayerRow>();
    if (!actor) { await resolveDeferredStratagem(roomId, pending); return; }
    const hand = parse<Card[]>(actor.hand_json, []); const negation = hand.find((card) => card.kind === "Negation");
    if (negation && !isBotPlayer(actor)) return;
    // Bots use Negation defensively for their own affected character. They do
    // not blindly counter an existing Negation or spend one on another
    // character's decision; human players may still choose either action.
    const botWillNegate = Boolean(negation && !pending.negated && actor.id === pending.effectTargetId);
    const claim = await db().prepare("UPDATE rooms SET phase = 'resolving' WHERE id = ? AND phase = 'response' AND pending_json = ?").bind(roomId, room.pending_json).run(); if ((claim.meta.changes ?? 0) <= 0) continue;
    if (!botWillNegate) {
      const nextId = pending.remainingIds[0];
      if (nextId) { const next: NegationPending = { ...pending, actorId: nextId, remainingIds: pending.remainingIds.slice(1), deadline: 0 }; await db().prepare("UPDATE rooms SET phase = 'response', pending_json = ? WHERE id = ?").bind(JSON.stringify(next), roomId).run(); continue; }
      await resolveDeferredStratagem(roomId, pending); return;
    }
    if (!negation) return;
    const discard = parse<Card[]>(room.discard_json, []); let log = parse<string[]>(room.log_json, []); const nextHand = hand.filter((card) => card.id !== negation.id);
    log = addCardEvent(log, actor.name, negation, actor.name); log = addLog(log, `${actor.name} plays Negation ${pending.negated ? "to restore" : "to cancel"} ${pending.cardName}'s effect.`);
    const rows = await db().prepare("SELECT * FROM players WHERE room_id = ? ORDER BY seat").bind(roomId).all<PlayerRow>(); const updatedPlayers = (rows.results ?? []).map((player) => player.id === actor.id ? { ...player, hand_json: JSON.stringify(nextHand) } : player); const holders = playersHoldingNegation(updatedPlayers, nextAliveSeat(updatedPlayers, actor.seat));
    const next: NegationPending = { ...pending, negated: !pending.negated, actorId: holders[0]?.id ?? actor.id, remainingIds: holders.slice(1).map((player) => player.id), reason: `Play Negation to ${pending.negated ? "cancel the counter-Negation" : "counter the Negation"}, or pass`, deadline: 0, ...(pending.heldCards ? { heldCards: [...pending.heldCards, negation] } : { }) };
    if (!pending.heldCards) discard.push(negation);
    await db().batch([db().prepare("UPDATE players SET hand_json = ? WHERE id = ?").bind(JSON.stringify(nextHand), actor.id), db().prepare("UPDATE rooms SET phase = ?, pending_json = ?, discard_json = ?, log_json = ? WHERE id = ?").bind(holders.length ? "response" : "resolving", holders.length ? JSON.stringify(next) : room.pending_json, JSON.stringify(discard), JSON.stringify(log), roomId)]);
    if (!holders.length) { await resolveDeferredStratagem(roomId, next); return; }
  }
}

async function startNegation(room: RoomRow, source: PlayerRow, players: PlayerRow[], card: Card, targetName: string, effectTargetId: string, effect: DeferredStratagem, hand: Card[], deck: Card[], discard: Card[], log: string[]): Promise<Card[]> {
  const holders = playersHoldingNegation(players, nextAliveSeat(players, source.seat)).filter((player) => player.id !== source.id);
  const holdUntilTargetedEffectFinishes = effect.kind === "dismantle" || effect.kind === "steal";
  const sequenceDiscard = holdUntilTargetedEffectFinishes ? discard.filter((discarded) => discarded.id !== card.id) : discard;
  const base = { sourceId: source.id, negated: false, cardName: cardDefinition(card.kind).name, effectTargetId, resumePhase: room.phase ?? "play", effect, ...(holdUntilTargetedEffectFinishes ? { heldCards: [card] } : {}) };
  if (!holders.length) {
    const pending: NegationPending = { kind: "negation", ...base, actorId: source.id, remainingIds: [], reason: "Resolving stratagem" };
    await db().batch([db().prepare("UPDATE players SET hand_json = ? WHERE id = ?").bind(JSON.stringify(hand), source.id), db().prepare("UPDATE rooms SET phase = 'resolving', pending_json = ?, deck_json = ?, discard_json = ?, log_json = ? WHERE id = ?").bind(JSON.stringify(pending), JSON.stringify(deck), JSON.stringify(sequenceDiscard), JSON.stringify(log), room.id)]);
    return resolveDeferredStratagem(room.id, pending);
  }
  const pending: NegationPending = { kind: "negation", ...base, actorId: holders[0].id, remainingIds: holders.slice(1).map((player) => player.id), reason: `Play Negation to cancel ${cardDefinition(card.kind).name}'s effect on ${targetName}, or pass` };
  await db().batch([db().prepare("UPDATE players SET hand_json = ? WHERE id = ?").bind(JSON.stringify(hand), source.id), db().prepare("UPDATE rooms SET phase = 'response', pending_json = ?, deck_json = ?, discard_json = ?, log_json = ? WHERE id = ?").bind(JSON.stringify(pending), JSON.stringify(deck), JSON.stringify(sequenceDiscard), JSON.stringify(log), room.id)]);
  await advanceNegation(room.id);
  return [];
}

async function finishDodgedAttack(room: RoomRow, source: PlayerRow | null, target: PlayerRow | null, discard: Card[], log: string[], resumePhase: string, sequenceStartCardId: string, writes: D1PreparedStatement[] = []) {
  const followUpAttack = parse<Card[]>(source?.hand_json ?? null, []).find(isAttackCard);
  if (source?.alive && target?.alive && hasGreenDragonBlade(source) && followUpAttack) {
    const pending: GreenDragonPending = { kind: "green_dragon", sourceId: source.id, targetId: target.id, actorId: source.id, resumePhase, sequenceStartCardId, reason: `Green Dragon Blade: play another Attack on ${target.name}, or skip` };
    log = addLog(log, `${source.name}'s Attack is blocked. Green Dragon Blade may continue against ${target.name}.`);
    writes.push(db().prepare("UPDATE rooms SET phase = 'response', pending_json = ?, discard_json = ?, log_json = ? WHERE id = ?").bind(JSON.stringify(pending), JSON.stringify(discard), JSON.stringify(log), room.id));
    await db().batch(writes);
    await advanceGreenDragon(room.id);
    return;
  }
  if (source?.alive && target?.alive && hasRockCleavingAxe(source) && rockCleavingCards(source, parse<Card[]>(source.hand_json, [])).length >= 2) {
    const pending: RockCleavingPending = { kind: "rock_cleaving", sourceId: source.id, targetId: target.id, actorId: source.id, resumePhase, sequenceStartCardId, reason: `Rock Cleaving Axe: discard 2 cards to force the Attack's damage on ${target.name}, or skip` };
    log = addLog(log, `${source.name}'s Attack is blocked. Rock Cleaving Axe may force its damage on ${target.name}.`);
    writes.push(db().prepare("UPDATE rooms SET phase = 'response', pending_json = ?, discard_json = ?, log_json = ? WHERE id = ?").bind(JSON.stringify(pending), JSON.stringify(discard), JSON.stringify(log), room.id));
    await db().batch(writes);
    await advanceRockCleaving(room.id);
    return;
  }
  writes.push(db().prepare("UPDATE rooms SET phase = ?, pending_json = NULL, discard_json = ?, log_json = ? WHERE id = ?").bind(resumePhase, JSON.stringify(discard), JSON.stringify(log), room.id));
  await db().batch(writes);
  if (source) await continueAfterDying(room.id, source.id);
}

async function resolveRockCleaving(room: RoomRow, pending: RockCleavingPending, source: PlayerRow, target: PlayerRow, players: PlayerRow[], materials: Card[], hand: Card[], discard: Card[], log: string[]) {
  const materialIds = new Set(materials.map((card) => card.id));
  const nextHand = hand.filter((card) => !materialIds.has(card.id));
  const nextEquipment = Object.fromEntries(Object.entries(equipmentZone(source)).filter(([, card]) => !card || !materialIds.has(card.id))) as EquipmentZone;
  discard.push(...materials);
  log = addCardGroupEvent(log, source.name, materials, "play", true, target.name, `${source.name} discards 2 cards with Rock Cleaving Axe to force the blocked Attack's damage on ${target.name}.`);
  log = addLog(log, `${source.name} discards 2 cards with Rock Cleaving Axe and forces the blocked Attack to damage ${target.name}.`);
  const sourceWrites = [
    db().prepare("UPDATE players SET hand_json = ?, equipment_json = ? WHERE id = ?").bind(JSON.stringify(nextHand), JSON.stringify(nextEquipment), source.id),
  ];
  const updatedSource = { ...source, hand_json: JSON.stringify(nextHand), equipment_json: JSON.stringify(nextEquipment) } satisfies PlayerRow;
  const hp = Math.max(0, (target.hp ?? 1) - 1);
  if (hp === 0) {
    log = addLog(log, `${target.name} takes 1 damage from Rock Cleaving Axe and enters Dying. Peach rescue begins in turn order.`);
    await startDyingRescue(room, updatedSource, target, players, parse<Card[]>(room.deck_json, []), discard, log, sourceWrites, updatedSource, pending.resumePhase);
    return;
  }
  log = addLog(log, `${target.name} takes 1 damage from Rock Cleaving Axe. Action returns to ${source.name}.`);
  await db().batch([
    ...sourceWrites,
    db().prepare("UPDATE players SET hp = ? WHERE id = ?").bind(hp, target.id),
    db().prepare("UPDATE rooms SET phase = ?, pending_json = NULL, discard_json = ?, log_json = ? WHERE id = ?").bind(pending.resumePhase, JSON.stringify(discard), JSON.stringify(log), room.id),
  ]);
  await continueAfterDying(room.id, source.id);
}

async function advanceRockCleaving(roomId: string) {
  const room = await db().prepare("SELECT * FROM rooms WHERE id = ?").bind(roomId).first<RoomRow>();
  const pending = parse<Pending | null>(room?.pending_json ?? null, null);
  if (!room || room.phase !== "response" || pending?.kind !== "rock_cleaving") return;
  const rows = await db().prepare("SELECT * FROM players WHERE room_id = ? ORDER BY seat").bind(roomId).all<PlayerRow>(); const players = rows.results ?? [];
  const source = players.find((player) => player.id === pending.sourceId && player.alive); const target = players.find((player) => player.id === pending.targetId && player.alive);
  const hand = parse<Card[]>(source?.hand_json ?? null, []); const materials = rockCleavingCards(source, hand).slice(0, 2);
  if (source && target && materials.length === 2 && hasRockCleavingAxe(source) && !isBotPlayer(source)) return;
  const claim = await db().prepare("UPDATE rooms SET phase = 'resolving' WHERE id = ? AND phase = 'response' AND pending_json = ?").bind(roomId, room.pending_json).run();
  if ((claim.meta.changes ?? 0) <= 0) return;
  if (!source || !target || materials.length !== 2 || !hasRockCleavingAxe(source)) {
    const log = addLog(parse<string[]>(room.log_json, []), `${source?.name ?? "The attacker"} does not use Rock Cleaving Axe.`);
    await db().prepare("UPDATE rooms SET phase = ?, pending_json = NULL, log_json = ? WHERE id = ?").bind(pending.resumePhase, JSON.stringify(log), roomId).run();
    if (source) await continueAfterDying(roomId, source.id);
    return;
  }
  await resolveRockCleaving(room, pending, source, target, players, materials, hand, parse<Card[]>(room.discard_json, []), parse<string[]>(room.log_json, []));
}

async function resolveGreenDragonAttack(room: RoomRow, pending: GreenDragonPending, source: PlayerRow, target: PlayerRow, players: PlayerRow[], attack: Card, sourceHand: Card[], discard: Card[], log: string[]) {
  const nextSourceHand = sourceHand.filter((card) => card.id !== attack.id);
  const updatedSource = { ...source, hand_json: JSON.stringify(nextSourceHand) } satisfies PlayerRow;
  discard.push(attack); log = addCardEvent(log, source.name, attack, target.name); log = addLog(log, `${source.name} uses Green Dragon Blade to play another Attack on ${target.name}.`);
  let targetHand = parse<Card[]>(target.hand_json, []); const dodge = targetHand.find((card) => card.kind === "Dodge");
  if (!isBotPlayer(target)) {
    const attackPending: AttackPending = { kind: "attack", sourceId: source.id, targetId: target.id, actorId: target.id, resumePhase: pending.resumePhase, sequenceStartCardId: pending.sequenceStartCardId, reason: "Respond to Attack: play Dodge or skip and take 1 damage" };
    await db().batch([
      db().prepare("UPDATE players SET hand_json = ? WHERE id = ?").bind(JSON.stringify(nextSourceHand), source.id),
      db().prepare("UPDATE rooms SET phase = 'response', pending_json = ?, discard_json = ?, log_json = ? WHERE id = ?").bind(JSON.stringify(attackPending), JSON.stringify(discard), JSON.stringify(log), room.id),
    ]);
    return;
  }
  if (dodge) {
    targetHand = targetHand.filter((card) => card.id !== dodge.id); const updatedTarget = { ...target, hand_json: JSON.stringify(targetHand) } satisfies PlayerRow;
    discard.push(dodge); log = addCardEvent(log, target.name, dodge, source.name); log = addLog(log, `${target.name} plays Dodge and blocks the Green Dragon Blade follow-up Attack.`);
    await finishDodgedAttack(room, updatedSource, updatedTarget, discard, log, pending.resumePhase, pending.sequenceStartCardId, [
      db().prepare("UPDATE players SET hand_json = ? WHERE id = ?").bind(JSON.stringify(nextSourceHand), source.id),
      db().prepare("UPDATE players SET hand_json = ? WHERE id = ?").bind(JSON.stringify(targetHand), target.id),
    ]);
    return;
  }
  const hp = Math.max(0, (target.hp ?? 1) - 1); log = addLog(log, `${target.name} takes 1 damage from the Green Dragon Blade follow-up${hp === 0 ? " and enters Dying. Peach rescue begins in turn order." : "."}`);
  if (hp === 0) {
    await startDyingRescue(room, updatedSource, target, players, parse<Card[]>(room.deck_json, []), discard, log, [db().prepare("UPDATE players SET hand_json = ? WHERE id = ?").bind(JSON.stringify(nextSourceHand), source.id)], updatedSource, pending.resumePhase);
    return;
  }
  await db().batch([
    db().prepare("UPDATE players SET hand_json = ? WHERE id = ?").bind(JSON.stringify(nextSourceHand), source.id),
    db().prepare("UPDATE players SET hp = ? WHERE id = ?").bind(hp, target.id),
    db().prepare("UPDATE rooms SET phase = ?, pending_json = NULL, discard_json = ?, log_json = ? WHERE id = ?").bind(pending.resumePhase, JSON.stringify(discard), JSON.stringify(log), room.id),
  ]);
  await continueAfterDying(room.id, source.id);
}

async function advanceGreenDragon(roomId: string) {
  const room = await db().prepare("SELECT * FROM rooms WHERE id = ?").bind(roomId).first<RoomRow>();
  const pending = parse<Pending | null>(room?.pending_json ?? null, null);
  if (!room || room.phase !== "response" || pending?.kind !== "green_dragon") return;
  const rows = await db().prepare("SELECT * FROM players WHERE room_id = ? ORDER BY seat").bind(roomId).all<PlayerRow>(); const players = rows.results ?? [];
  const source = players.find((player) => player.id === pending.sourceId && player.alive); const target = players.find((player) => player.id === pending.targetId && player.alive);
  const hand = parse<Card[]>(source?.hand_json ?? null, []); const attack = hand.find(isAttackCard);
  if (source && target && attack && hasGreenDragonBlade(source) && !isBotPlayer(source)) return;
  const claim = await db().prepare("UPDATE rooms SET phase = 'resolving' WHERE id = ? AND phase = 'response' AND pending_json = ?").bind(roomId, room.pending_json).run();
  if ((claim.meta.changes ?? 0) <= 0) return;
  if (!source || !target || !attack || !hasGreenDragonBlade(source)) {
    const log = addLog(parse<string[]>(room.log_json, []), `${source?.name ?? "The attacker"} does not continue with Green Dragon Blade.`);
    await db().prepare("UPDATE rooms SET phase = ?, pending_json = NULL, log_json = ? WHERE id = ?").bind(pending.resumePhase, JSON.stringify(log), roomId).run();
    if (source) await continueAfterDying(roomId, source.id);
    return;
  }
  await resolveGreenDragonAttack(room, pending, source, target, players, attack, hand, parse<Card[]>(room.discard_json, []), parse<string[]>(room.log_json, []));
}

async function advanceDuel(roomId: string) {
  for (let guard = 0; guard < 30; guard++) {
    const room = await db().prepare("SELECT * FROM rooms WHERE id = ?").bind(roomId).first<RoomRow>();
    const pending = parse<Pending | null>(room?.pending_json ?? null, null);
    if (!room || room.phase !== "response" || pending?.kind !== "duel") return;
    const actor = await db().prepare("SELECT * FROM players WHERE id = ?").bind(pending.actorId).first<PlayerRow>();
    const opponent = await db().prepare("SELECT * FROM players WHERE id = ?").bind(pending.opponentId).first<PlayerRow>();
    if (!actor || !opponent || !isBotPlayer(actor)) return;
    let hand = parse<Card[]>(actor.hand_json, []); const discard = parse<Card[]>(room.discard_json, []); let log = parse<string[]>(room.log_json, []);
    const attack = hand.find(isAttackCard); const serpentCards = attack ? [] : botSerpentSpearCards(actor, hand); const attackCards = attack ? [attack] : serpentCards;
    const claim = await db().prepare("UPDATE rooms SET phase = 'resolving' WHERE id = ? AND phase = 'response' AND pending_json = ?").bind(roomId, room.pending_json).run();
    if ((claim.meta.changes ?? 0) <= 0) continue;
    if (!attackCards.length) { await resolveDuelLoss(room, pending, actor, opponent, discard, log); return; }
    const attackIds = new Set(attackCards.map((card) => card.id)); hand = hand.filter((card) => !attackIds.has(card.id)); discard.push(...attackCards);
    log = attack ? addCardEvent(log, actor.name, attack, opponent.name) : addCardGroupEvent(log, actor.name, attackCards, "play", true, opponent.name); log = addLog(log, attack ? `${actor.name} plays Attack in the Duel. Action passes to ${opponent.name}.` : `${actor.name} discards 2 cards with Serpent Spear to form an Attack in the Duel. Action passes to ${opponent.name}.`);
    const nextPending: DuelPending = { ...pending, actorId: opponent.id, opponentId: actor.id, reason: `Respond to Duel: select Attack or take 1 damage`, deadline: 0 };
    await db().batch([
      db().prepare("UPDATE players SET hand_json = ? WHERE id = ?").bind(JSON.stringify(hand), actor.id),
      db().prepare("UPDATE rooms SET phase = 'response', pending_json = ?, discard_json = ?, log_json = ? WHERE id = ?").bind(JSON.stringify(nextPending), JSON.stringify(discard), JSON.stringify(log), roomId),
    ]);
  }
}

function nextGroupPending(pending: GroupPending, players: PlayerRow[]) {
  const nextIds = pending.remainingIds.filter((id) => players.some((player) => player.id === id && player.alive));
  if (!nextIds.length) return null;
  const actorId = nextIds[0];
  return { ...pending, actorId, remainingIds: nextIds.slice(1), reason: `Respond to ${pending.cardKind === "BarbarianInvasion" ? "Barbarian Invasion" : "Raining Arrows"}: select ${pending.requiredKind} or take 1 damage`, deadline: 0 } satisfies GroupPending;
}

async function beginGroupTarget(room: RoomRow, pending: GroupPending, players: PlayerRow[], discard: Card[], log: string[], writes: D1PreparedStatement[] = []) {
  const actor = players.find((player) => player.id === pending.actorId && player.alive);
  const source = players.find((player) => player.id === pending.sourceId);
  if (!actor || !source) {
    await finishGroupStep(room, pending, players, discard, log, writes);
    return;
  }
  const holders = playersHoldingNegation(players, actor.seat).filter((player) => player.id !== source.id);
  if (!holders.length) {
    writes.push(db().prepare("UPDATE rooms SET phase = 'response', pending_json = ?, discard_json = ?, log_json = ? WHERE id = ?").bind(JSON.stringify(pending), JSON.stringify(discard), JSON.stringify(log), room.id));
    await db().batch(writes);
    await advanceGroup(room.id);
    return;
  }
  const cardName = pending.cardKind === "BarbarianInvasion" ? "Barbarian Invasion" : "Raining Arrows";
  const negation: NegationPending = {
    kind: "negation",
    sourceId: pending.sourceId,
    actorId: holders[0].id,
    remainingIds: holders.slice(1).map((player) => player.id),
    negated: false,
    cardName,
    effectTargetId: actor.id,
    resumePhase: pending.resumePhase,
    effect: { kind: "group", pending },
    heldCards: pending.heldCards,
    reason: `Play Negation to cancel ${cardName}'s effect on ${actor.name}, or pass`,
  };
  writes.push(db().prepare("UPDATE rooms SET phase = 'response', pending_json = ?, discard_json = ?, log_json = ? WHERE id = ?").bind(JSON.stringify(negation), JSON.stringify(discard), JSON.stringify(log), room.id));
  await db().batch(writes);
  await advanceNegation(room.id);
}

async function finishGroupStep(room: RoomRow, pending: GroupPending, players: PlayerRow[], discard: Card[], log: string[], writes: D1PreparedStatement[] = []) {
  const next = nextGroupPending(pending, players);
  if (next) {
    await beginGroupTarget(room, next, players, discard, log, writes);
    return;
  }
  writes.push(db().prepare("UPDATE rooms SET phase = ?, pending_json = NULL, discard_json = ?, log_json = ? WHERE id = ?").bind(pending.resumePhase, JSON.stringify(commitHeldGroupCards(discard, pending)), JSON.stringify(addLog(log, `${pending.cardKind === "BarbarianInvasion" ? "Barbarian Invasion" : "Raining Arrows"} finishes resolving.`)), room.id));
  await db().batch(writes);
  await continueAfterDying(room.id, pending.sourceId);
}

async function resolveGroupDamage(room: RoomRow, pending: GroupPending, actor: PlayerRow, source: PlayerRow, players: PlayerRow[], discard: Card[], log: string[]) {
  const hp = Math.max(0, (actor.hp ?? 1) - 1);
  const cardName = pending.cardKind === "BarbarianInvasion" ? "Barbarian Invasion" : "Raining Arrows";
  const next = nextGroupPending(pending, players.map((player) => player.id === actor.id ? { ...player, hp } : player));
  if (hp === 0) {
    log = addLog(log, `${actor.name} does not play ${pending.requiredKind}, takes 1 damage from ${cardName}, and enters Dying. Peach rescue begins in turn order.`);
    const resumePending = next ?? { ...pending, actorId: "", remainingIds: [] };
    await startDyingRescue(room, source, actor, players, parse<Card[]>(room.deck_json, []), discard, log, [], source, pending.resumePhase, resumePending);
    return;
  }
  actor.hp = hp;
  log = addLog(log, `${actor.name} does not play ${pending.requiredKind} and takes 1 damage from ${cardName}.`);
  await finishGroupStep(room, pending, players, discard, log, [db().prepare("UPDATE players SET hp = ? WHERE id = ?").bind(hp, actor.id)]);
}

async function advanceGroup(roomId: string) {
  for (let guard = 0; guard < 30; guard++) {
    const room = await db().prepare("SELECT * FROM rooms WHERE id = ?").bind(roomId).first<RoomRow>();
    const pending = parse<Pending | null>(room?.pending_json ?? null, null);
    if (!room || room.phase !== "response" || pending?.kind !== "group") return;
    const rows = await db().prepare("SELECT * FROM players WHERE room_id = ? ORDER BY seat").bind(roomId).all<PlayerRow>();
    const players = rows.results ?? []; const actor = players.find((player) => player.id === pending.actorId && player.alive); const source = players.find((player) => player.id === pending.sourceId && player.alive);
    if (!source) return;
    if (!actor) {
      const claim = await db().prepare("UPDATE rooms SET phase = 'resolving' WHERE id = ? AND phase = 'response' AND pending_json = ?").bind(roomId, room.pending_json).run();
      if ((claim.meta.changes ?? 0) <= 0) continue;
      await finishGroupStep(room, pending, players, parse<Card[]>(room.discard_json, []), parse<string[]>(room.log_json, []));
      return;
    }
    if (!isBotPlayer(actor)) return;
    let hand = parse<Card[]>(actor.hand_json, []); const discard = parse<Card[]>(room.discard_json, []); let log = parse<string[]>(room.log_json, []);
    const response = hand.find((card) => pending.requiredKind === "Attack" ? isAttackCard(card) : card.kind === "Dodge"); const serpentCards = !response && pending.requiredKind === "Attack" ? botSerpentSpearCards(actor, hand) : []; const responseCards = response ? [response] : serpentCards;
    const claim = await db().prepare("UPDATE rooms SET phase = 'resolving' WHERE id = ? AND phase = 'response' AND pending_json = ?").bind(roomId, room.pending_json).run();
    if ((claim.meta.changes ?? 0) <= 0) continue;
    if (!responseCards.length) { await resolveGroupDamage(room, pending, actor, source, players, discard, log); return; }
    const responseIds = new Set(responseCards.map((card) => card.id)); hand = hand.filter((card) => !responseIds.has(card.id)); const nextPending = appendHeldGroupCards(pending, responseCards);
    log = response ? addCardEvent(log, actor.name, response) : addCardGroupEvent(log, actor.name, responseCards, "play"); log = addLog(log, response ? `${actor.name} plays ${pending.requiredKind} against ${pending.cardKind === "BarbarianInvasion" ? "Barbarian Invasion" : "Raining Arrows"}.` : `${actor.name} discards 2 cards with Serpent Spear to form an Attack against Barbarian Invasion.`);
    await finishGroupStep(room, nextPending, players, discard, log, [db().prepare("UPDATE players SET hand_json = ? WHERE id = ?").bind(JSON.stringify(hand), actor.id)]);
    return;
  }
}

function nextHarvestPending(pending: HarvestPending, players: PlayerRow[]) {
  const nextIds = pending.remainingIds.filter((id) => players.some((player) => player.id === id && player.alive));
  if (!nextIds.length || !harvestAvailableIds(pending).length) return null;
  const actorId = nextIds[0];
  const actor = players.find((player) => player.id === actorId);
  return { ...pending, actorId, remainingIds: nextIds.slice(1), previewCardId: undefined, botAdvanceAt: isBotPlayer(actor) ? Date.now() + HARVEST_BOT_THINK_MS : undefined, completeAt: undefined, reason: "Choose 1 revealed card from Bumper Harvest" } satisfies HarvestPending;
}

function harvestChoices(pending: HarvestPending) { return pending.choices ?? []; }
function harvestAvailableIds(pending: HarvestPending) {
  const chosenIds = new Set(harvestChoices(pending).map((choice) => choice.cardId));
  return pending.availableIds ?? pending.revealed.map((card) => card.id).filter((id) => !chosenIds.has(id));
}

function commitHeldHarvestCards(discard: Card[], pending: HarvestPending) {
  const available = new Set(harvestAvailableIds(pending));
  const finishing = [...(pending.heldCards ?? []), ...pending.revealed.filter((card) => available.has(card.id))];
  const existing = new Set(discard.map((card) => card.id));
  return [...discard, ...finishing.filter((card) => !existing.has(card.id))];
}

async function queueHarvestCompletion(room: RoomRow, pending: HarvestPending, deck: Card[], discard: Card[], log: string[], writes: D1PreparedStatement[] = []) {
  const complete = { ...pending, previewCardId: undefined, botAdvanceAt: undefined, completeAt: Date.now() + HARVEST_CHOICE_HOLD_MS, reason: "Showing the final Bumper Harvest result" } satisfies HarvestPending;
  writes.push(db().prepare("UPDATE rooms SET phase = 'response', pending_json = ?, deck_json = ?, discard_json = ?, log_json = ? WHERE id = ?").bind(JSON.stringify(complete), JSON.stringify(deck), JSON.stringify(discard), JSON.stringify(log), room.id));
  await db().batch(writes);
}

async function beginHarvestTarget(room: RoomRow, pending: HarvestPending, players: PlayerRow[], deck: Card[], discard: Card[], log: string[], writes: D1PreparedStatement[] = []) {
  if (!harvestAvailableIds(pending).length) {
    await queueHarvestCompletion(room, pending, deck, discard, log, writes);
    return;
  }
  const actor = players.find((player) => player.id === pending.actorId && player.alive);
  const source = players.find((player) => player.id === pending.sourceId);
  if (!actor || !source) {
    const next = nextHarvestPending(pending, players);
    if (next) return beginHarvestTarget(room, next, players, deck, discard, log, writes);
    await queueHarvestCompletion(room, pending, deck, discard, log, writes);
    return;
  }
  const holders = playersHoldingNegation(players, actor.seat);
  if (!holders.length) {
    const ready = { ...pending, botAdvanceAt: isBotPlayer(actor) ? Date.now() + HARVEST_BOT_THINK_MS : undefined, reason: "Choose 1 revealed card from Bumper Harvest" } satisfies HarvestPending;
    writes.push(db().prepare("UPDATE rooms SET phase = 'response', pending_json = ?, deck_json = ?, discard_json = ?, log_json = ? WHERE id = ?").bind(JSON.stringify(ready), JSON.stringify(deck), JSON.stringify(discard), JSON.stringify(log), room.id));
    await db().batch(writes);
    await advanceHarvest(room.id);
    return;
  }
  const negation: NegationPending = {
    kind: "negation",
    sourceId: pending.sourceId,
    actorId: holders[0].id,
    remainingIds: holders.slice(1).map((player) => player.id),
    negated: false,
    cardName: "Bumper Harvest",
    effectTargetId: actor.id,
    resumePhase: pending.resumePhase,
    effect: { kind: "harvest_target", pending },
    heldCards: pending.heldCards,
    reason: `Play Negation to cancel Bumper Harvest's effect on ${actor.name}, or pass`,
  };
  writes.push(db().prepare("UPDATE rooms SET phase = 'response', pending_json = ?, deck_json = ?, discard_json = ?, log_json = ? WHERE id = ?").bind(JSON.stringify(negation), JSON.stringify(deck), JSON.stringify(discard), JSON.stringify(log), room.id));
  await db().batch(writes);
  await advanceNegation(room.id);
}

async function resolveHarvestChoice(room: RoomRow, pending: HarvestPending, actor: PlayerRow, players: PlayerRow[], chosen: Card) {
  const hand = [...parse<Card[]>(actor.hand_json, []), chosen];
  let log = parse<string[]>(room.log_json, []);
  log = addCardEvent(log, actor.name, chosen, actor.name, "gain", false);
  log = addHistory(log, `${actor.name} chooses ${chosen.rank}${chosen.suit} ${cardDefinition(chosen.kind).name} from Bumper Harvest.`);
  const remainingPending: HarvestPending = {
    ...pending,
    availableIds: harvestAvailableIds(pending).filter((id) => id !== chosen.id),
    choices: [...harvestChoices(pending), { cardId: chosen.id, playerId: actor.id, playerName: actor.name }],
    previewCardId: undefined,
    botAdvanceAt: undefined,
  };
  const next = nextHarvestPending(remainingPending, players);
  if (next) {
    await beginHarvestTarget(room, next, players.map((player) => player.id === actor.id ? { ...player, hand_json: JSON.stringify(hand) } : player), parse<Card[]>(room.deck_json, []), parse<Card[]>(room.discard_json, []), log, [db().prepare("UPDATE players SET hand_json = ? WHERE id = ?").bind(JSON.stringify(hand), actor.id)]);
    return;
  }
  await queueHarvestCompletion(room, remainingPending, parse<Card[]>(room.deck_json, []), parse<Card[]>(room.discard_json, []), log, [db().prepare("UPDATE players SET hand_json = ? WHERE id = ?").bind(JSON.stringify(hand), actor.id)]);
}

async function advanceHarvest(roomId: string) {
  for (let guard = 0; guard < 12; guard++) {
    const room = await db().prepare("SELECT * FROM rooms WHERE id = ?").bind(roomId).first<RoomRow>();
    const pending = parse<Pending | null>(room?.pending_json ?? null, null);
    if (!room || room.phase !== "response" || pending?.kind !== "harvest") return;
    if (pending.completeAt) {
      if (Date.now() < pending.completeAt) return;
      const log = addHistory(parse<string[]>(room.log_json, []), "Bumper Harvest finishes resolving.");
      const discard = commitHeldHarvestCards(parse<Card[]>(room.discard_json, []), pending);
      const claim = await db().prepare("UPDATE rooms SET phase = ?, pending_json = NULL, discard_json = ?, log_json = ? WHERE id = ? AND phase = 'response' AND pending_json = ?").bind(pending.resumePhase, JSON.stringify(discard), JSON.stringify(log), roomId, room.pending_json).run();
      if ((claim.meta.changes ?? 0) > 0) await continueAfterDying(roomId, pending.sourceId);
      return;
    }
    const rows = await db().prepare("SELECT * FROM players WHERE room_id = ? ORDER BY seat").bind(roomId).all<PlayerRow>();
    const players = rows.results ?? []; const actor = players.find((player) => player.id === pending.actorId && player.alive);
    if (!actor) {
      const next = nextHarvestPending(pending, players);
      if (!next) {
        await queueHarvestCompletion(room, pending, parse<Card[]>(room.deck_json, []), parse<Card[]>(room.discard_json, []), parse<string[]>(room.log_json, []));
        return;
      }
      await beginHarvestTarget(room, next, players, parse<Card[]>(room.deck_json, []), parse<Card[]>(room.discard_json, []), parse<string[]>(room.log_json, []));
      return;
    }
    if (!isBotPlayer(actor)) return;
    const availableIds = harvestAvailableIds(pending); const chosen = pending.revealed.find((card) => availableIds.includes(card.id));
    if (!chosen) {
      await queueHarvestCompletion(room, pending, parse<Card[]>(room.deck_json, []), parse<Card[]>(room.discard_json, []), parse<string[]>(room.log_json, []));
      return;
    }
    if (!pending.previewCardId) {
      if ((pending.botAdvanceAt ?? 0) > Date.now()) return;
      const preview: HarvestPending = { ...pending, previewCardId: chosen.id, botAdvanceAt: Date.now() + HARVEST_CHOICE_HOLD_MS, reason: `${actor.name} is choosing ${cardDefinition(chosen.kind).name}` };
      await db().prepare("UPDATE rooms SET pending_json = ? WHERE id = ? AND phase = 'response' AND pending_json = ?").bind(JSON.stringify(preview), roomId, room.pending_json).run();
      return;
    }
    if ((pending.botAdvanceAt ?? 0) > Date.now()) return;
    const previewed = pending.revealed.find((card) => card.id === pending.previewCardId && availableIds.includes(card.id));
    if (!previewed) return;
    const claim = await db().prepare("UPDATE rooms SET phase = 'resolving' WHERE id = ? AND phase = 'response' AND pending_json = ?").bind(roomId, room.pending_json).run();
    if ((claim.meta.changes ?? 0) <= 0) continue;
    await resolveHarvestChoice(room, pending, actor, players, previewed);
    return;
  }
}

async function runBots(roomId: string) {
  for (let guard = 0; guard < 12; guard++) {
    const room = await db().prepare("SELECT * FROM rooms WHERE id = ?").bind(roomId).first<RoomRow>();
    const rows = await db().prepare("SELECT * FROM players WHERE room_id = ? ORDER BY seat").bind(roomId).all<PlayerRow>();
    const players = rows.results ?? []; const bot = players.find((player) => player.seat === room?.turn_seat);
    if (!room || room.status !== "playing" || room.phase === "response" || room.phase === "dying" || !isBotPlayer(bot)) return;
    let deck = parse<Card[]>(room.deck_json, []); let discard = parse<Card[]>(room.discard_json, []); let log = parse<string[]>(room.log_json, []); let hand = parse<Card[]>(bot.hand_json, []);
    let judgementResolved = false; let judgementRemaining: Card[] = []; const judgementWrites: D1PreparedStatement[] = [];
    if (room.phase?.startsWith("draw")) {
      const delayed = parse<Card[]>(bot.judgement_json, [])[0] ?? null;
      if (delayed && await startJudgementNegation(room, bot, players, delayed, deck, discard, log)) return;
      const judgement = resolveTurnJudgement(bot, players, deck, discard, log); const priorFlags = drawPhaseFlags(room.phase); deck = judgement.deck; discard = judgement.discard; log = judgement.log; judgement.skipPlay ||= priorFlags.skipPlay; judgement.skipDraw ||= priorFlags.skipDraw; judgementResolved = judgement.resolved; judgementRemaining = judgement.remaining;
      if (judgement.transferTarget && judgement.transferredCard) {
        const transferred = [...parse<Card[]>(judgement.transferTarget.judgement_json, []), judgement.transferredCard];
        judgementWrites.push(db().prepare("UPDATE players SET judgement_json = ? WHERE id = ?").bind(JSON.stringify(transferred), judgement.transferTarget.id));
      }
      if (judgement.damage > 0) {
        const hp = Math.max(0, (bot.hp ?? 1) - judgement.damage); bot.hp = hp;
        if (hp === 0) {
          log = addLog(log, `${bot.name} enters Dying from Lightning. Peach rescue begins in turn order.`);
          judgementWrites.push(db().prepare("UPDATE players SET judgement_json = ? WHERE id = ?").bind(JSON.stringify(judgementRemaining), bot.id));
          await startDyingRescue(room, null, bot, players, deck, discard, log, judgementWrites, bot, drawPhaseFor(judgement.skipPlay, judgement.skipDraw)); return;
        }
        judgementWrites.push(db().prepare("UPDATE players SET hp = ? WHERE id = ?").bind(hp, bot.id));
      }
      if (judgementRemaining.length) {
        judgementWrites.push(db().prepare("UPDATE players SET judgement_json = ? WHERE id = ?").bind(JSON.stringify(judgementRemaining), bot.id));
        judgementWrites.push(db().prepare("UPDATE rooms SET phase = ?, deck_json = ?, discard_json = ?, log_json = ? WHERE id = ?").bind(drawPhaseFor(judgement.skipPlay, judgement.skipDraw), JSON.stringify(deck), JSON.stringify(discard), JSON.stringify(log), roomId));
        await db().batch(judgementWrites); continue;
      }
      if (judgement.skipDraw) log = addLog(log, `${bot.name} skips the Draw Phase because of Rations Depleted.`);
      else { const draw = drawCards(deck, discard, 2, log); deck = draw.deck; discard = draw.discard; log = addLog(draw.log, `${bot.name}'s turn started · drawing ${draw.drawn.length} card${draw.drawn.length === 1 ? "" : "s"}.`); hand.push(...draw.drawn); }
      if (judgement.skipPlay) {
        const skippedDiscards: Card[] = []; const handLimit = Math.max(0, bot.hp ?? 0);
        while (hand.length > handLimit) { const skipped = hand.shift(); if (skipped) { discard.push(skipped); skippedDiscards.push(skipped); } }
        if (skippedDiscards.length) log = addDiscardEvent(log, bot.name, skippedDiscards);
        log = addLog(log, `${bot.name} skips the Play Phase because of Overindulgence, completes Discard and Ending, and their turn ends.`);
        const next = nextAliveSeat(players, bot.seat);
        await db().batch([...judgementWrites, db().prepare("UPDATE players SET hand_json = ?, judgement_json = '[]' WHERE id = ?").bind(JSON.stringify(hand), bot.id), db().prepare("UPDATE rooms SET turn_seat = ?, phase = 'draw', deck_json = ?, discard_json = ?, log_json = ? WHERE id = ?").bind(next, JSON.stringify(deck), JSON.stringify(discard), JSON.stringify(log), roomId)]);
        continue;
      }
    }
    for (let drawTwo = hand.find((card) => card.kind === "DrawTwo"); drawTwo; drawTwo = hand.find((card) => card.kind === "DrawTwo")) {
      hand = hand.filter((card) => card.id !== drawTwo!.id);
      const draw = drawCards(deck, discard, 2, log); deck = draw.deck; discard = draw.discard; hand.push(...draw.drawn);
      discard.push(drawTwo);
      log = addCardEvent(draw.log, bot.name, drawTwo); log = addHistory(log, `${bot.name} plays Something Out of Nothing and draws ${draw.drawn.length} cards.`);
    }
    while ((bot.hp ?? 0) < (bot.max_hp ?? 0)) {
      const peach = hand.find((card) => card.kind === "Peach"); if (!peach) break;
      hand = hand.filter((card) => card.id !== peach.id); discard.push(peach); bot.hp = (bot.hp ?? 0) + 1; log = addCardEvent(log, bot.name, peach); log = addLog(log, `${bot.name} plays Peach and recovers 1 HP.`);
    }
    const writes = [...judgementWrites]; if (judgementResolved) writes.push(db().prepare("UPDATE players SET judgement_json = '[]' WHERE id = ?").bind(bot.id)); const changedHands = new Map<string, Card[]>();
    const weapon = hand.find((card) => cardDefinition(card.kind).equipmentSlot === "weapon");
    if (weapon && weaponCard(bot)?.kind !== weapon.kind) {
      const equipment = equipmentZone(bot); const replacedWeapon = equipment.weapon;
      hand = hand.filter((card) => card.id !== weapon.id);
      if (replacedWeapon) { discard.push(replacedWeapon); log = addCardEvent(log, bot.name, replacedWeapon, bot.name, "discard", false); }
      equipment.weapon = weapon; bot.equipment_json = JSON.stringify(equipment);
      log = addCardEvent(log, bot.name, weapon, bot.name, "equip"); log = addLog(log, `${bot.name} equips ${cardDefinition(weapon.kind).name}${replacedWeapon ? ` and discards ${cardDefinition(replacedWeapon.kind).name}` : ""}.`);
      writes.push(db().prepare("UPDATE players SET equipment_json = ? WHERE id = ?").bind(bot.equipment_json, bot.id));
    }
    const oath = hand.find((card) => card.kind === "Oath");
    const wounded = players.filter((player) => player.alive && (player.hp ?? 0) < (player.max_hp ?? 0));
    if (oath && wounded.length) {
      hand = hand.filter((card) => card.id !== oath.id); discard.push(oath);
      for (const player of wounded) { player.hp = Math.min(player.max_hp ?? 0, (player.hp ?? 0) + 1); writes.push(db().prepare("UPDATE players SET hp = ? WHERE id = ?").bind(player.hp, player.id)); }
      log = addCardEvent(log, bot.name, oath, "All wounded players"); log = addLog(log, `${bot.name} plays Oath of the Peach Garden. ${wounded.map((player) => player.name).join(", ")} recover 1 HP.`);
    }
    const steal = hand.find((card) => card.kind === "Steal");
    const stealTarget = players.find((player) => player.alive && player.id !== bot.id && distanceBetween(players, bot.id, player.id) === 1 && parse<Card[]>(player.hand_json, []).length > 0);
    if (steal && stealTarget) {
      const targetHand = parse<Card[]>(stealTarget.hand_json, []); const stolen = targetHand.shift()!;
      hand = hand.filter((card) => card.id !== steal.id); hand.push(stolen); discard.push(steal); changedHands.set(stealTarget.id, targetHand);
      log = addCardEvent(log, bot.name, steal, stealTarget.name); log = addHistory(log, `${bot.name} uses Steal to obtain one hidden card from ${stealTarget.name}.`);
      writes.push(db().prepare("UPDATE players SET hand_json = ? WHERE id = ?").bind(JSON.stringify(targetHand), stealTarget.id));
    }
    const dismantle = hand.find((card) => card.kind === "Dismantle");
    const dismantleTarget = players.find((player) => player.alive && player.id !== bot.id && (changedHands.get(player.id) ?? parse<Card[]>(player.hand_json, [])).length > 0);
    if (dismantle && dismantleTarget) {
      const targetHand = changedHands.get(dismantleTarget.id) ?? parse<Card[]>(dismantleTarget.hand_json, []); const dismantled = targetHand.shift()!;
      hand = hand.filter((card) => card.id !== dismantle.id); discard.push(dismantle, dismantled); changedHands.set(dismantleTarget.id, targetHand);
      log = addCardEvent(log, bot.name, dismantle, dismantleTarget.name); log = addCardEvent(log, dismantleTarget.name, dismantled, dismantleTarget.name, "discard"); log = addHistory(log, `${bot.name} dismantles one hidden card from ${dismantleTarget.name}.`);
      writes.push(db().prepare("UPDATE players SET hand_json = ? WHERE id = ?").bind(JSON.stringify(targetHand), dismantleTarget.id));
    }
    const harvest = hand.find((card) => card.kind === "BumperHarvest");
    const harvestTargets = playersInTurnOrder(players, bot.seat);
    if (harvest && harvestTargets.length) {
      hand = hand.filter((card) => card.id !== harvest.id);
      const draw = drawCards(deck, discard, harvestTargets.length, log); deck = draw.deck; discard = draw.discard; log = draw.log;
      const choosers = harvestTargets.slice(0, draw.drawn.length);
      log = addCardEvent(log, bot.name, harvest, "All living players"); log = addCardGroupEvent(log, bot.name, draw.drawn, "reveal", false);
      log = addHistory(log, `${bot.name} plays Bumper Harvest and reveals ${draw.drawn.length} card${draw.drawn.length === 1 ? "" : "s"}. ${choosers[0]?.name ?? "No player"} resolves first.`);
      writes.push(db().prepare("UPDATE players SET hand_json = ?, hp = ? WHERE id = ?").bind(JSON.stringify(hand), bot.hp, bot.id));
      if (!choosers.length) {
        discard.push(harvest);
        writes.push(db().prepare("UPDATE rooms SET phase = 'play', pending_json = NULL, deck_json = ?, discard_json = ?, log_json = ? WHERE id = ?").bind(JSON.stringify(deck), JSON.stringify(discard), JSON.stringify(log), roomId));
        await db().batch(writes); continue;
      }
      const pending: HarvestPending = { kind: "harvest", sourceId: bot.id, actorId: choosers[0].id, remainingIds: choosers.slice(1).map((player) => player.id), revealed: draw.drawn, availableIds: draw.drawn.map((card) => card.id), choices: [], resumePhase: "play", reason: "Choose 1 revealed card from Bumper Harvest", heldCards: [harvest] };
      await beginHarvestTarget(room, pending, players.map((player) => player.id === bot.id ? { ...player, hand_json: JSON.stringify(hand) } : changedHands.has(player.id) ? { ...player, hand_json: JSON.stringify(changedHands.get(player.id)) } : player), deck, discard, log, writes); return;
    }
    const groupCard = hand.find((card) => card.kind === "BarbarianInvasion" || card.kind === "RainingArrows");
    const groupTargets = playersInTurnOrder(players, bot.seat).filter((player) => player.alive && player.id !== bot.id);
    if (groupCard && groupTargets.length) {
      hand = hand.filter((card) => card.id !== groupCard.id);
      const requiredKind = groupCard.kind === "BarbarianInvasion" ? "Attack" : "Dodge"; const cardName = groupCard.kind === "BarbarianInvasion" ? "Barbarian Invasion" : "Raining Arrows";
      log = addCardEvent(log, bot.name, groupCard, "All other players"); log = addLog(log, `${bot.name} plays ${cardName}. Action passes to ${groupTargets[0].name} to play ${requiredKind}.`);
      const pending: GroupPending = { kind: "group", cardKind: groupCard.kind, sourceId: bot.id, actorId: groupTargets[0].id, remainingIds: groupTargets.slice(1).map((player) => player.id), requiredKind, resumePhase: "play", reason: `Respond to ${cardName}: select ${requiredKind} or take 1 damage`, heldCards: [groupCard] };
      writes.push(db().prepare("UPDATE players SET hand_json = ?, hp = ? WHERE id = ?").bind(JSON.stringify(hand), bot.hp, bot.id));
      writes.push(db().prepare("UPDATE rooms SET deck_json = ? WHERE id = ?").bind(JSON.stringify(deck), roomId));
      const playersForNegation = players.map((player) => player.id === bot.id ? { ...player, hand_json: JSON.stringify(hand) } : changedHands.has(player.id) ? { ...player, hand_json: JSON.stringify(changedHands.get(player.id)) } : player);
      await beginGroupTarget(room, pending, playersForNegation, discard, log, writes); return;
    }
    const lightning = hand.find((card) => card.kind === "Lightning");
    if (lightning && !parse<Card[]>(bot.judgement_json, []).some((delayed) => delayed.kind === "Lightning")) {
      hand = hand.filter((card) => card.id !== lightning.id); discard.push(lightning);
      log = addCardEvent(log, bot.name, lightning); log = addLog(log, `${bot.name} plays Lightning into their own Judgement Zone.`);
      if (writes.length) await db().batch(writes);
      const playersForNegation = players.map((player) => player.id === bot.id ? { ...player, hand_json: JSON.stringify(hand) } : changedHands.has(player.id) ? { ...player, hand_json: JSON.stringify(changedHands.get(player.id)) } : player);
      await startNegation(room, { ...bot, hand_json: JSON.stringify(hand) }, playersForNegation, lightning, bot.name, bot.id, { kind: "lightning", targetId: bot.id, cardId: lightning.id }, hand, deck, discard, log); return;
    }
    const overindulgence = hand.find((card) => card.kind === "Overindulgence");
    const overindulgenceTarget = playersInTurnOrder(players, bot.seat).find((player) => player.id !== bot.id && !parse<Card[]>(player.judgement_json, []).some((delayed) => delayed.kind === "Overindulgence"));
    if (overindulgence && overindulgenceTarget) {
      hand = hand.filter((card) => card.id !== overindulgence.id); discard.push(overindulgence);
      log = addCardEvent(log, bot.name, overindulgence, overindulgenceTarget.name); log = addLog(log, `${bot.name} plays Overindulgence on ${overindulgenceTarget.name}.`);
      if (writes.length) await db().batch(writes);
      const playersForNegation = players.map((player) => player.id === bot.id ? { ...player, hand_json: JSON.stringify(hand) } : changedHands.has(player.id) ? { ...player, hand_json: JSON.stringify(changedHands.get(player.id)) } : player);
      await startNegation(room, { ...bot, hand_json: JSON.stringify(hand) }, playersForNegation, overindulgence, overindulgenceTarget.name, overindulgenceTarget.id, { kind: "overindulgence", targetId: overindulgenceTarget.id, cardId: overindulgence.id }, hand, deck, discard, log); return;
    }
    const rationsDepleted = hand.find((card) => card.kind === "RationsDepleted");
    const rationsTarget = playersInTurnOrder(players, bot.seat).find((player) => player.id !== bot.id && distanceBetween(players, bot.id, player.id) <= 1 && !parse<Card[]>(player.judgement_json, []).some((delayed) => delayed.kind === "RationsDepleted"));
    if (rationsDepleted && rationsTarget) {
      hand = hand.filter((card) => card.id !== rationsDepleted.id); discard.push(rationsDepleted);
      log = addCardEvent(log, bot.name, rationsDepleted, rationsTarget.name); log = addLog(log, `${bot.name} plays Rations Depleted on ${rationsTarget.name}.`);
      if (writes.length) await db().batch(writes);
      const playersForNegation = players.map((player) => player.id === bot.id ? { ...player, hand_json: JSON.stringify(hand) } : changedHands.has(player.id) ? { ...player, hand_json: JSON.stringify(changedHands.get(player.id)) } : player);
      await startNegation(room, { ...bot, hand_json: JSON.stringify(hand) }, playersForNegation, rationsDepleted, rationsTarget.name, rationsTarget.id, { kind: "rations_depleted", targetId: rationsTarget.id, cardId: rationsDepleted.id }, hand, deck, discard, log); return;
    }
    const duel = hand.find((card) => card.kind === "Duel");
    const duelTarget = players.filter((player) => player.alive && player.id !== bot.id).sort((a, b) => (a.hp ?? 99) - (b.hp ?? 99))[0];
    if (duel && duelTarget) {
      hand = hand.filter((card) => card.id !== duel.id); discard.push(duel);
      log = addCardEvent(log, bot.name, duel, duelTarget.name); log = addLog(log, `${bot.name} starts a Duel with ${duelTarget.name}. Action passes to ${duelTarget.name} to play Attack.`);
      const pending: DuelPending = { kind: "duel", sourceId: bot.id, targetId: duelTarget.id, actorId: duelTarget.id, opponentId: bot.id, resumePhase: "play", reason: "Respond to Duel: select Attack or take 1 damage" };
      writes.push(db().prepare("UPDATE players SET hand_json = ?, hp = ? WHERE id = ?").bind(JSON.stringify(hand), bot.hp, bot.id));
      writes.push(db().prepare("UPDATE rooms SET phase = 'response', pending_json = ?, deck_json = ?, discard_json = ?, log_json = ? WHERE id = ?").bind(JSON.stringify(pending), JSON.stringify(deck), JSON.stringify(discard), JSON.stringify(log), roomId));
      await db().batch(writes); await advanceDuel(roomId); return;
    }
    const attack = hand.find(isAttackCard);
    const serpentCards = attack ? [] : botSerpentSpearCards(bot, hand);
    const attackCards = attack ? [attack] : serpentCards;
    const targets = players.filter((player) => player.alive && player.id !== bot.id && distanceBetween(players, bot.id, player.id) <= attackRangeFor(bot)).sort((a, b) => (a.hp ?? 99) - (b.hp ?? 99));
    const target = targets[0];
    if (attackCards.length && target) {
      const attackIds = new Set(attackCards.map((card) => card.id));
      const sequenceStartCardId = attackCards[0].id;
      hand = hand.filter((card) => !attackIds.has(card.id)); discard.push(...attackCards);
      log = attack ? addCardEvent(log, bot.name, attack, target.name) : addCardGroupEvent(log, bot.name, attackCards, "play", true, target.name);
      if (!attack) log = addLog(log, `${bot.name} discards 2 cards with Serpent Spear to form an Attack on ${target.name}.`);
      let targetHand = changedHands.get(target.id) ?? parse<Card[]>(target.hand_json, []); const dodge = targetHand.find((card) => card.kind === "Dodge");
      if (dodge) {
        if (!isBotPlayer(target)) {
          log = addLog(log, `${bot.name} plays Attack on ${target.name}. Action passes from ${bot.name} to ${target.name} for Dodge response.`);
          writes.push(db().prepare("UPDATE players SET hand_json = ?, hp = ? WHERE id = ?").bind(JSON.stringify(hand), bot.hp, bot.id));
          writes.push(db().prepare("UPDATE rooms SET phase = 'response', pending_json = ?, deck_json = ?, discard_json = ?, log_json = ? WHERE id = ?").bind(JSON.stringify({ kind: "attack", sourceId: bot.id, targetId: target.id, actorId: target.id, resumePhase: phaseAfterAttack(bot), sequenceStartCardId, reason: "Respond to Attack: select Dodge or take 1 damage" } satisfies AttackPending), JSON.stringify(deck), JSON.stringify(discard), JSON.stringify(log), roomId));
          await db().batch(writes); return;
        }
        targetHand = targetHand.filter((card) => card.id !== dodge.id); discard.push(dodge); log = addCardEvent(log, target.name, dodge, bot.name); log = addLog(log, `${target.name} plays Dodge and blocks the Attack.`);
        await finishDodgedAttack(room, { ...bot, hand_json: JSON.stringify(hand) }, { ...target, hand_json: JSON.stringify(targetHand) }, discard, log, phaseAfterAttack(bot), sequenceStartCardId, [...writes, db().prepare("UPDATE players SET hand_json = ?, hp = ? WHERE id = ?").bind(JSON.stringify(hand), bot.hp, bot.id), db().prepare("UPDATE players SET hand_json = ? WHERE id = ?").bind(JSON.stringify(targetHand), target.id)]);
        return;
      } else {
        target.hp = Math.max(0, (target.hp ?? 1) - 1); log = addLog(log, `${target.name} takes 1 damage${target.hp === 0 ? " and enters Dying. Peach rescue begins in turn order." : `. Action returns to ${bot.name}.`}`);
        if (target.hp === 0) {
          await startDyingRescue(room, bot, target, players, deck, discard, log, [...writes, db().prepare("UPDATE players SET hand_json = ?, hp = ? WHERE id = ?").bind(JSON.stringify(hand), bot.hp, bot.id)]); return;
        }
        writes.push(db().prepare("UPDATE players SET hp = ? WHERE id = ?").bind(target.hp, target.id));
      }
    }
    if (attack && target && hasZhugeCrossbow(bot) && hand.some(isAttackCard)) {
      writes.push(db().prepare("UPDATE players SET hand_json = ?, hp = ? WHERE id = ?").bind(JSON.stringify(hand), bot.hp, bot.id));
      writes.push(db().prepare("UPDATE rooms SET phase = 'play', deck_json = ?, discard_json = ?, log_json = ? WHERE id = ?").bind(JSON.stringify(deck), JSON.stringify(discard), JSON.stringify(log), roomId));
      await db().batch(writes);
      continue;
    }
    const handLimit = Math.max(0, bot.hp ?? 0); const discarded: Card[] = [];
    while (hand.length > handLimit) { const card = hand.shift(); if (card) { discard.push(card); discarded.push(card); } }
    if (discarded.length) { log = addDiscardEvent(log, bot.name, discarded); log = addLog(log, `${bot.name} discards ${discarded.length} card${discarded.length === 1 ? "" : "s"} to meet the hand limit.`); }
    const refreshed = players.map((player) => player.id === target?.id ? target : player); const next = nextAliveSeat(refreshed, bot.seat);
    writes.push(db().prepare("UPDATE players SET hand_json = ?, hp = ? WHERE id = ?").bind(JSON.stringify(hand), bot.hp, bot.id));
    writes.push(db().prepare("UPDATE rooms SET turn_seat = ?, phase = 'draw', deck_json = ?, discard_json = ?, log_json = ? WHERE id = ?").bind(next, JSON.stringify(deck), JSON.stringify(discard), JSON.stringify(addLog(log, `${bot.name} completes Discard and Ending; their turn ends.`)), roomId));
    await db().batch(writes);
  }
}

async function roomState(code: string, token?: string) {
  const db = env.DB;
  const room = await db.prepare("SELECT * FROM rooms WHERE code = ?").bind(code).first<RoomRow>();
  if (!room) return null;
  const result = await db.prepare("SELECT * FROM players WHERE room_id = ? ORDER BY seat").bind(room.id).all<PlayerRow>();
  const players = result.results ?? [];
  const rawLog = parse<string[]>(room.log_json, []);
  const pending = parse<Pending | null>(room.pending_json, null);
  const tokenHash = token ? await hash(token) : "";
  const me = players.find((player) => player.token_hash === tokenHash);
  const turnPlayer = players.find((player) => player.seat === room.turn_seat);
  const actualActionPlayerId = room.phase === "response" || room.phase === "dying" ? pending?.actorId ?? pending?.targetId ?? turnPlayer?.id ?? null : turnPlayer?.id ?? null;
  const actionPlayerId = room.phase === "dying" && me?.id !== actualActionPlayerId ? null : actualActionPlayerId;
  const privateActionReason = pending?.reason ?? (room.phase?.startsWith("draw") ? "Resolve judgement, then draw two cards" : room.phase?.startsWith("play") ? "Play cards or finish the Play Phase" : room.phase === "discard" ? "Discard down to the hand limit" : room.phase === "resolving" ? "Resolving the submitted action" : room.phase === "finished" ? "Match complete" : "Waiting for the next legal action");
  const actionReason = room.phase === "dying" && me?.id !== actualActionPlayerId ? "Waiting — no rescue action is required from you." : privateActionReason;
  return {
    code: room.code, status: room.status, maxPlayers: room.max_players,
    isHost: me?.id === room.host_player_id, meId: me?.id ?? null,
    myRole: room.status !== "lobby" ? publicRoleName(me?.role) : null,
    myHeroOptions: room.status === "heroes" && me?.hero_options_json ? JSON.parse(me.hero_options_json) : [],
    turnSeat: room.turn_seat, phase: room.phase, deckCount: parse<Card[]>(room.deck_json, []).length, discardTop: parse<Card[]>(room.discard_json, []).at(-1) ?? null,
    log: rawLog.flatMap((entry, index) => { if (entry.startsWith("@card:") || entry.startsWith("@cards:")) return []; if (entry.startsWith("@history:")) { try { return [(JSON.parse(entry.slice(9)) as { message: string }).message]; } catch { return []; } } const event = messageEvent(entry, index); return event ? [event.message] : []; }),
    timeline: gameTimeline(rawLog), myHand: me ? parse<Card[]>(me.hand_json, []) : [], isMyTurn: me?.seat === room.turn_seat, actionPlayerId, actionReason, isMyAction: me?.id === actualActionPlayerId,
    pendingAttack: pending?.kind === "attack" ? pending : null,
    pendingGreenDragon: pending?.kind === "green_dragon" ? pending : null,
    pendingRockCleaving: pending?.kind === "rock_cleaving" ? pending : null,
    pendingDuel: pending?.kind === "duel" ? pending : null,
    pendingGroup: pending?.kind === "group" ? pending : pending?.kind === "dying" ? pending.resumePending ?? null : null,
    pendingNegation: pending?.kind === "negation" ? { sourceId: pending.sourceId, actorId: pending.actorId, effectTargetId: pending.effectTargetId, cardName: pending.cardName, negated: pending.negated, deadline: pending.deadline ?? 0 } : null,
    pendingHarvest: pending?.kind === "harvest" ? { sourceId: pending.sourceId, actorId: pending.actorId, revealed: pending.revealed, availableIds: harvestAvailableIds(pending), choices: harvestChoices(pending), previewCardId: pending.previewCardId ?? null, complete: Boolean(pending.completeAt), countdownUntil: pending.completeAt ?? pending.botAdvanceAt ?? 0 } : null,
    pendingTargetCard: pending?.kind === "target_card" ? { sourceId: pending.sourceId, actorId: pending.actorId, targetId: pending.targetId, cardKind: pending.cardKind } : null,
    pendingDying: pending?.kind === "dying" ? { sourceId: pending.sourceId, targetId: pending.targetId, deadline: me?.id === pending.actorId ? pending.deadline : 0 } : null,
    players: players.map((player) => ({ id: player.id, name: player.name.replace(/^Test General (\d+)$/, "Player $1"), seat: player.seat, hero: player.hero, hp: player.hp, maxHp: player.max_hp, alive: Boolean(player.alive), handCount: parse<Card[]>(player.hand_json, []).length, judgementCards: parse<Card[]>(player.judgement_json, []), equipmentCards: equipmentCards(player), attackRange: attackRangeFor(player), distance: me ? distanceBetween(players, me.id, player.id) : null, isHost: player.id === room.host_player_id, isBot: isBotPlayer(player), role: player.role === "Lord" || !player.alive || room.status === "finished" || player.id === me?.id ? publicRoleName(player.role) : null })),
  };
}

export async function GET(request: Request) {
  await setup();
  const url = new URL(request.url);
  const code = (url.searchParams.get("code") ?? "").toUpperCase();
  const token = url.searchParams.get("token") ?? "";
  if (url.searchParams.get("audit") === "1") {
    const room = await env.DB.prepare("SELECT * FROM rooms WHERE code = ?").bind(code).first<RoomRow>();
    if (!room) return json({ error: "Room not found." }, 404);
    const member = await env.DB.prepare("SELECT id FROM players WHERE room_id = ? AND token_hash = ?").bind(room.id, await hash(token)).first();
    if (!member) return json({ error: "A valid room member session is required to read the audit." }, 403);
    const result = await env.DB.prepare("SELECT id,event_key,event_type,actor_id,actor_name,action,phase_before,phase_after,turn_seat_before,turn_seat_after,acting_player_before,acting_player_after,detail_json,created_at FROM game_audit WHERE room_id = ? ORDER BY id").bind(room.id).all();
    return json({ code, audit: result.results ?? [] });
  }
  const liveRoom = await env.DB.prepare("SELECT id FROM rooms WHERE code = ?").bind(code).first<{ id: string }>();
  if (liveRoom) { await expireDyingRescue(liveRoom.id); await advanceHarvest(liveRoom.id); }
  const state = await roomState(code, token);
  return state ? json(state) : json({ error: "Room not found." }, 404);
}

export async function POST(request: Request) {
  await setup();
  const body = await request.json<Record<string, unknown>>().catch(() => ({}));
  const action = String(body.action ?? "");
  const name = cleanName(body.name);
  const db = env.DB;

  if (action === "create") {
    const quickStart = body.quickStart === true; const playerName = quickStart ? "ME" : name;
    if (playerName.length < 2) return json({ error: "Enter a name with at least 2 characters." }, 400);
    const roomId = crypto.randomUUID(); const playerId = crypto.randomUUID(); const token = newToken(); let code = randomCode();
    for (let attempt = 0; attempt < 4; attempt++) { const exists = await db.prepare("SELECT 1 FROM rooms WHERE code = ?").bind(code).first(); if (!exists) break; code = randomCode(); }
    const inserts = [
      db.prepare("INSERT INTO rooms (id, code, host_player_id, status, max_players, created_at) VALUES (?, ?, ?, 'lobby', 8, ?)").bind(roomId, code, playerId, Date.now()),
      db.prepare("INSERT INTO players (id, room_id, name, token_hash, seat, connected_at) VALUES (?, ?, ?, ?, 0, ?)").bind(playerId, roomId, playerName, await hash(token), Date.now()),
    ];
    if (quickStart) for (let index = 1; index <= 3; index++) inserts.push(db.prepare("INSERT INTO players (id, room_id, name, token_hash, seat, connected_at) VALUES (?, ?, ?, ?, ?, ?)").bind(crypto.randomUUID(), roomId, `Player ${index}`, `bot:${crypto.randomUUID()}`, index, Date.now()));
    await db.batch(inserts);
    if (quickStart) {
      await resetAudit(roomId);
      const createdRoom = await db.prepare("SELECT * FROM rooms WHERE id = ?").bind(roomId).first<RoomRow>(); const host = await db.prepare("SELECT * FROM players WHERE id = ?").bind(playerId).first<PlayerRow>();
      if (createdRoom && host) await recordAuditAction(createdRoom, host, playerName, "quick_start");
      await beginRandomizedMatch(roomId, playerId);
    }
    return json({ token, room: await roomState(code, token) }, 201);
  }

  const code = String(body.code ?? "").trim().toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 5);
  const token = String(body.token ?? "");
  const room = await db.prepare("SELECT * FROM rooms WHERE code = ?").bind(code).first<RoomRow>();
  if (!room) return json({ error: "Room not found. Check the five-character code." }, 404);
  // Let the acting client submit its automatic decline at the deadline before
  // the general expiry check races that same request.
  if (!["give_peach", "skip_rescue"].includes(action)) await expireDyingRescue(room.id);

  if (action === "join") {
    if (name.length < 2) return json({ error: "Enter a name with at least 2 characters." }, 400);
    if (room.status !== "lobby") return json({ error: "This match has already started." }, 409);
    const count = await db.prepare("SELECT COUNT(*) AS count FROM players WHERE room_id = ?").bind(room.id).first<{ count: number }>();
    if ((count?.count ?? 0) >= room.max_players) return json({ error: "This room is full." }, 409);
    const used = await db.prepare("SELECT seat FROM players WHERE room_id = ? ORDER BY seat").bind(room.id).all<{ seat: number }>();
    const seats = new Set((used.results ?? []).map((row) => row.seat)); let seat = 0; while (seats.has(seat)) seat++;
    const playerId = crypto.randomUUID(); const playerToken = newToken();
    await db.prepare("INSERT INTO players (id, room_id, name, token_hash, seat, connected_at) VALUES (?, ?, ?, ?, ?, ?)").bind(playerId, room.id, name, await hash(playerToken), seat, Date.now()).run();
    return json({ token: playerToken, room: await roomState(code, playerToken) }, 201);
  }

  const tokenHash = await hash(token);
  const me = await db.prepare("SELECT * FROM players WHERE room_id = ? AND token_hash = ?").bind(room.id, tokenHash).first<PlayerRow>();
  if (action !== "start") await recordAuditAction(room, me ?? null, name, action);
  if (GAMEPLAY_ACTIONS.has(action)) {
    const currentRoom = await db.prepare("SELECT * FROM rooms WHERE id = ?").bind(room.id).first<RoomRow>();
    const currentPlayers = await db.prepare("SELECT * FROM players WHERE room_id = ? ORDER BY seat").bind(room.id).all<PlayerRow>();
    const issue = currentRoom ? playingStateIssue(currentRoom, currentPlayers.results ?? []) : "The game room is unavailable.";
    if (issue) return json({ error: `Game state check failed: ${issue}` }, 409);
  }

  if (action === "add_test_players") {
    if (!me || me.id !== room.host_player_id) return json({ error: "Only the host can add test players." }, 403);
    if (room.status !== "lobby") return json({ error: "Test players can only be added before the match starts." }, 409);
    const result = await db.prepare("SELECT seat FROM players WHERE room_id = ? ORDER BY seat").bind(room.id).all<{ seat: number }>();
    const seats = new Set((result.results ?? []).map((row) => row.seat));
    const needed = Math.max(0, 4 - seats.size);
    const inserts = [];
    for (let index = 0; index < needed; index++) {
      let seat = 0; while (seats.has(seat)) seat++; seats.add(seat);
      inserts.push(db.prepare("INSERT INTO players (id, room_id, name, token_hash, seat, connected_at) VALUES (?, ?, ?, ?, ?, ?)").bind(crypto.randomUUID(), room.id, `Player ${index + 1}`, `bot:${crypto.randomUUID()}`, seat, Date.now()));
    }
    if (inserts.length) await db.batch(inserts);
    return json({ room: await roomState(code, token) });
  }

  if (action === "start") {
    if (!me || me.id !== room.host_player_id) return json({ error: "Only the host can start the match." }, 403);
    const result = await db.prepare("SELECT * FROM players WHERE room_id = ? ORDER BY seat").bind(room.id).all<PlayerRow>();
    const players = result.results ?? [];
    if (players.length < 4) return json({ error: "Classic mode needs at least 4 players." }, 409);
    await resetAudit(room.id);
    await recordAuditAction(room, me, name, action);
    const roles = [...ROLE_SETS[players.length]].sort(() => Math.random() - 0.5);
    const lordIndex = players.findIndex((player) => player.id === room.host_player_id); const lordAt = roles.indexOf("Lord");
    [roles[lordAt], roles[lordIndex]] = [roles[lordIndex], roles[lordAt]];
    const rulers = HEROES.filter((hero) => ["cao-cao", "liu-bei", "sun-quan"].includes(hero.id));
    const shuffledHeroes = HEROES.filter((hero) => !rulers.some((ruler) => ruler.id === hero.id)).sort(() => Math.random() - 0.5);
    let heroCursor = 0;
    await db.batch([
      ...players.map((player, index) => {
        const options = roles[index] === "Lord" ? [...rulers, ...Array.from({ length: 2 }, () => shuffledHeroes[heroCursor++ % shuffledHeroes.length])] : Array.from({ length: 3 }, () => shuffledHeroes[heroCursor++ % shuffledHeroes.length]);
        const botHero = isBotPlayer(player) ? options[0] : null;
        const hp = botHero ? botHero.hp + (roles[index] === "Lord" ? 1 : 0) : null;
        return db.prepare("UPDATE players SET role = ?, hero = ?, hp = ?, max_hp = ?, hero_options_json = ? WHERE id = ?").bind(roles[index], botHero?.id ?? null, hp, hp, JSON.stringify(options), player.id);
      }),
      db.prepare("UPDATE rooms SET status = 'heroes' WHERE id = ?").bind(room.id),
    ]);
    return json({ room: await roomState(code, token) });
  }

  if (action === "choose_hero") {
    if (!me) return json({ error: "Your player session is no longer valid." }, 403);
    if (room.status !== "heroes") return json({ error: "Hero selection is not active." }, 409);
    if (me.hero) return json({ error: "Your hero is already locked in." }, 409);
    const heroId = String(body.heroId ?? "");
    const options = me.hero_options_json ? JSON.parse(me.hero_options_json) as Hero[] : [];
    const hero = options.find((item) => item.id === heroId);
    if (!hero) return json({ error: "That hero is not one of your choices." }, 400);
    const taken = await db.prepare("SELECT 1 FROM players WHERE room_id = ? AND hero = ?").bind(room.id, hero.id).first();
    if (taken) return json({ error: "That hero was just selected. Choose another." }, 409);
    const hp = hero.hp + (me.role === "Lord" ? 1 : 0);
    await db.prepare("UPDATE players SET hero = ?, hp = ?, max_hp = ? WHERE id = ?").bind(hero.id, hp, hp, me.id).run();
    const remaining = await db.prepare("SELECT COUNT(*) AS count FROM players WHERE room_id = ? AND hero IS NULL").bind(room.id).first<{ count: number }>();
    if ((remaining?.count ?? 0) === 0) {
      const ready = await db.prepare("SELECT * FROM players WHERE room_id = ? ORDER BY seat").bind(room.id).all<PlayerRow>();
      await beginMatch(room.id, ready.results ?? []);
      await runBots(room.id);
    }
    return json({ room: await roomState(code, token) });
  }

  if (action === "start_response_timer") {
    if (!me) return json({ error: "Your player session is no longer valid." }, 403);
    const liveRoom = await db.prepare("SELECT * FROM rooms WHERE id = ?").bind(room.id).first<RoomRow>();
    const pending = parse<Pending | null>(liveRoom?.pending_json ?? null, null);
    if (!liveRoom || liveRoom.phase !== "response" || !pending || !["attack", "green_dragon", "rock_cleaving", "duel", "group", "negation"].includes(pending.kind) || pending.actorId !== me.id) return json({ error: "You are not the acting player for this response timer." }, 409);
    const responsePending = pending as AttackPending | GreenDragonPending | RockCleavingPending | DuelPending | GroupPending | NegationPending;
    if ((responsePending.deadline ?? 0) <= 0) {
      const timedPending = { ...responsePending, deadline: Date.now() + RESPONSE_TIMEOUT_MS };
      await db.prepare("UPDATE rooms SET pending_json = ? WHERE id = ? AND phase = 'response' AND pending_json = ?").bind(JSON.stringify(timedPending), room.id, liveRoom.pending_json).run();
    }
    return json({ room: await roomState(code, token) });
  }

  if (["respond_negation", "pass_negation"].includes(action)) {
    if (!me) return json({ error: "Your player session is no longer valid." }, 403);
    const liveRoom = await db.prepare("SELECT * FROM rooms WHERE id = ?").bind(room.id).first<RoomRow>(); const pending = parse<Pending | null>(liveRoom?.pending_json ?? null, null);
    if (!liveRoom || liveRoom.phase !== "response" || pending?.kind !== "negation" || pending.actorId !== me.id) return json({ error: "You are not the acting player for this Negation response." }, 409);
    let hand = parse<Card[]>(me.hand_json, []); const negation = action === "respond_negation" ? hand.find((card) => card.id === String(body.cardId ?? "") && card.kind === "Negation") : null;
    if (action === "respond_negation" && !negation) return json({ error: "Select a Negation card from your hand first." }, 409);
    const claim = await db.prepare("UPDATE rooms SET phase = 'resolving' WHERE id = ? AND phase = 'response' AND pending_json = ?").bind(room.id, liveRoom.pending_json).run(); if ((claim.meta.changes ?? 0) <= 0) return json({ error: "That Negation decision has already moved on." }, 409);
    if (negation) {
      hand = hand.filter((card) => card.id !== negation.id); const discard = parse<Card[]>(liveRoom.discard_json, []); let log = parse<string[]>(liveRoom.log_json, []);
      log = addCardEvent(log, me.name, negation, me.name); log = addLog(log, `${me.name} plays Negation ${pending.negated ? "to restore" : "to cancel"} ${pending.cardName}'s effect.`);
      const rows = await db.prepare("SELECT * FROM players WHERE room_id = ? ORDER BY seat").bind(room.id).all<PlayerRow>(); const updatedPlayers = (rows.results ?? []).map((player) => player.id === me.id ? { ...player, hand_json: JSON.stringify(hand) } : player); const holders = playersHoldingNegation(updatedPlayers, nextAliveSeat(updatedPlayers, me.seat));
      const next: NegationPending = { ...pending, negated: !pending.negated, actorId: holders[0]?.id ?? me.id, remainingIds: holders.slice(1).map((player) => player.id), reason: `Play Negation to ${pending.negated ? "cancel the counter-Negation" : "counter the Negation"}, or pass`, deadline: 0, ...(pending.heldCards ? { heldCards: [...pending.heldCards, negation] } : { }) };
      if (!pending.heldCards) discard.push(negation);
      await db.batch([db.prepare("UPDATE players SET hand_json = ? WHERE id = ?").bind(JSON.stringify(hand), me.id), db.prepare("UPDATE rooms SET phase = ?, pending_json = ?, discard_json = ?, log_json = ? WHERE id = ?").bind(holders.length ? "response" : "resolving", JSON.stringify(next), JSON.stringify(discard), JSON.stringify(log), room.id)]);
      if (holders.length) await advanceNegation(room.id); else await resolveDeferredStratagem(room.id, next);
    } else if (pending.remainingIds[0]) {
      const next: NegationPending = { ...pending, actorId: pending.remainingIds[0], remainingIds: pending.remainingIds.slice(1), deadline: 0 };
      await db.prepare("UPDATE rooms SET phase = 'response', pending_json = ? WHERE id = ?").bind(JSON.stringify(next), room.id).run(); await advanceNegation(room.id);
    } else await resolveDeferredStratagem(room.id, pending);
    return json({ room: await roomState(code, token) });
  }

  if (action === "preview_harvest") {
    if (!me) return json({ error: "Your player session is no longer valid." }, 403);
    const liveRoom = await db.prepare("SELECT * FROM rooms WHERE id = ?").bind(room.id).first<RoomRow>();
    const pending = parse<Pending | null>(liveRoom?.pending_json ?? null, null);
    if (!liveRoom || liveRoom.phase !== "response" || pending?.kind !== "harvest" || pending.completeAt || pending.actorId !== me.id) return json({ error: "Wait for your turn to choose from Bumper Harvest." }, 409);
    const cardId = typeof body.cardId === "string" ? body.cardId : "";
    if (cardId && !harvestAvailableIds(pending).includes(cardId)) return json({ error: "Choose one of the available Bumper Harvest cards." }, 400);
    const nextPending: HarvestPending = { ...pending, previewCardId: cardId || undefined };
    const update = await db.prepare("UPDATE rooms SET pending_json = ? WHERE id = ? AND phase = 'response' AND pending_json = ?").bind(JSON.stringify(nextPending), room.id, liveRoom.pending_json).run();
    if ((update.meta.changes ?? 0) <= 0) return json({ error: "The Bumper Harvest choice changed. Try again." }, 409);
    return json({ room: await roomState(code, token) });
  }

  if (action === "choose_harvest") {
    if (!me) return json({ error: "Your player session is no longer valid." }, 403);
    const liveRoom = await db.prepare("SELECT * FROM rooms WHERE id = ?").bind(room.id).first<RoomRow>();
    const pending = parse<Pending | null>(liveRoom?.pending_json ?? null, null);
    if (!liveRoom || liveRoom.phase !== "response" || pending?.kind !== "harvest" || pending.completeAt || pending.actorId !== me.id) return json({ error: "Wait for your turn to choose from Bumper Harvest." }, 409);
    const availableIds = harvestAvailableIds(pending); const chosen = pending.revealed.find((card) => card.id === String(body.cardId ?? "") && availableIds.includes(card.id));
    if (!chosen) return json({ error: "Choose one of the revealed Bumper Harvest cards." }, 400);
    const claim = await db.prepare("UPDATE rooms SET phase = 'resolving' WHERE id = ? AND phase = 'response' AND pending_json = ?").bind(room.id, liveRoom.pending_json).run();
    if ((claim.meta.changes ?? 0) <= 0) return json({ error: "That Bumper Harvest choice has already been resolved." }, 409);
    const rows = await db.prepare("SELECT * FROM players WHERE room_id = ? ORDER BY seat").bind(room.id).all<PlayerRow>();
    await resolveHarvestChoice(liveRoom, pending, me, rows.results ?? [], chosen);
    return json({ room: await roomState(code, token) });
  }

  if (action === "choose_target_card") {
    if (!me) return json({ error: "Your player session is no longer valid." }, 403);
    const liveRoom = await db.prepare("SELECT * FROM rooms WHERE id = ?").bind(room.id).first<RoomRow>();
    const pending = parse<Pending | null>(liveRoom?.pending_json ?? null, null);
    if (!liveRoom || liveRoom.phase !== "response" || pending?.kind !== "target_card" || pending.actorId !== me.id) return json({ error: "Wait until the stratagem has finished its Negation responses." }, 409);
    const target = await db.prepare("SELECT * FROM players WHERE room_id = ? AND id = ?").bind(room.id, pending.targetId).first<PlayerRow>();
    if (!target?.alive) return json({ error: "That target is no longer available." }, 409);
    const zone = String(body.targetCardZone ?? "") as TargetCardZone;
    let targetHand = parse<Card[]>(target.hand_json, []); let targetJudgement = parse<Card[]>(target.judgement_json, []); const targetEquipment = equipmentZone(target);
    let chosen: Card | undefined;
    if (zone === "hand") {
      const index = Number(body.targetCardIndex); if (Number.isInteger(index) && index >= 0 && index < targetHand.length) chosen = targetHand[index];
    } else if (zone === "equipment") chosen = equipmentCards(target).find((card) => card.id === String(body.targetCardId ?? ""));
    else if (zone === "judgement") chosen = targetJudgement.find((card) => card.id === String(body.targetCardId ?? ""));
    if (!chosen) return json({ error: "Choose one of the target's current cards." }, 400);
    const claim = await db.prepare("UPDATE rooms SET phase = 'resolving' WHERE id = ? AND phase = 'response' AND pending_json = ?").bind(room.id, liveRoom.pending_json).run();
    if ((claim.meta.changes ?? 0) <= 0) return json({ error: "That card choice has already resolved." }, 409);
    if (zone === "hand") targetHand = targetHand.filter((card) => card.id !== chosen?.id);
    else if (zone === "judgement") targetJudgement = targetJudgement.filter((card) => card.id !== chosen?.id);
    else for (const key of Object.keys(targetEquipment) as (keyof EquipmentZone)[]) if (targetEquipment[key]?.id === chosen.id) delete targetEquipment[key];
    let sourceHand = parse<Card[]>(me.hand_json, []); const discard = parse<Card[]>(liveRoom.discard_json, []); let log = parse<string[]>(liveRoom.log_json, []);
    discard.push(...(pending.heldCards ?? []));
    if (pending.cardKind === "Dismantle") {
      discard.push(chosen); log = addCardEvent(log, target.name, chosen, target.name, "discard");
      log = addHistory(log, `${me.name} uses Burning Bridges to discard one ${zone === "hand" ? "hidden hand" : zone} card from ${target.name}.`);
    } else {
      sourceHand = [...sourceHand, chosen];
      log = addHistory(log, `${me.name} uses Steal to obtain one ${zone === "hand" ? "hidden hand" : zone} card from ${target.name}.`);
    }
    await db.batch([
      db.prepare("UPDATE players SET hand_json = ?, judgement_json = ?, equipment_json = ? WHERE id = ?").bind(JSON.stringify(targetHand), JSON.stringify(targetJudgement), JSON.stringify(targetEquipment), target.id),
      db.prepare("UPDATE players SET hand_json = ? WHERE id = ?").bind(JSON.stringify(sourceHand), me.id),
      db.prepare("UPDATE rooms SET phase = ?, pending_json = NULL, discard_json = ?, log_json = ? WHERE id = ?").bind(pending.resumePhase, JSON.stringify(discard), JSON.stringify(log), room.id),
    ]);
    await continueAfterDying(room.id, me.id);
    return json({ room: await roomState(code, token) });
  }

  if (["respond_duel", "take_duel_damage"].includes(action)) {
    if (!me) return json({ error: "Your player session is no longer valid." }, 403);
    const liveRoom = await db.prepare("SELECT * FROM rooms WHERE id = ?").bind(room.id).first<RoomRow>(); const pending = parse<Pending | null>(liveRoom?.pending_json ?? null, null);
    if (!liveRoom || liveRoom.phase !== "response" || pending?.kind !== "duel" || pending.actorId !== me.id) return json({ error: "You are not the acting player for this Duel response." }, 409);
    let hand = parse<Card[]>(me.hand_json, []); const discard = parse<Card[]>(liveRoom.discard_json, []); let log = parse<string[]>(liveRoom.log_json, []);
    const opponent = await db.prepare("SELECT * FROM players WHERE id = ?").bind(pending.opponentId).first<PlayerRow>();
    if (!opponent) return json({ error: "The other duelist is no longer available." }, 409);
    const selectedAttack = action === "respond_duel" ? hand.find((card) => card.id === String(body.cardId ?? "") && isAttackCard(card)) : null; const serpentCards = action === "respond_duel" && !selectedAttack ? selectedSerpentSpearCards(me, hand, body.cardIds) : [];
    if (action === "respond_duel" && !selectedAttack && serpentCards.length !== 2) return json({ error: "Select an Attack, or use Serpent Spear with exactly 2 hand cards." }, 409);
    const claim = await db.prepare("UPDATE rooms SET phase = 'resolving' WHERE id = ? AND phase = 'response' AND pending_json = ?").bind(room.id, liveRoom.pending_json).run();
    if ((claim.meta.changes ?? 0) <= 0) return json({ error: "That Duel response has already been resolved." }, 409);
    if (!selectedAttack && !serpentCards.length) {
      await resolveDuelLoss(liveRoom, pending, me, opponent, discard, log);
    } else {
      const attackCards = selectedAttack ? [selectedAttack] : serpentCards; const attackIds = new Set(attackCards.map((card) => card.id)); hand = hand.filter((card) => !attackIds.has(card.id)); discard.push(...attackCards);
      log = selectedAttack ? addCardEvent(log, me.name, selectedAttack, opponent.name) : addCardGroupEvent(log, me.name, attackCards, "play", true, opponent.name); log = addLog(log, selectedAttack ? `${me.name} plays Attack in the Duel. Action passes to ${opponent.name}.` : `${me.name} discards 2 cards with Serpent Spear to form an Attack in the Duel. Action passes to ${opponent.name}.`);
      const nextPending: DuelPending = { ...pending, actorId: opponent.id, opponentId: me.id, reason: "Respond to Duel: select Attack or take 1 damage", deadline: 0 };
      await db.batch([
        db.prepare("UPDATE players SET hand_json = ? WHERE id = ?").bind(JSON.stringify(hand), me.id),
        db.prepare("UPDATE rooms SET phase = 'response', pending_json = ?, discard_json = ?, log_json = ? WHERE id = ?").bind(JSON.stringify(nextPending), JSON.stringify(discard), JSON.stringify(log), room.id),
      ]);
      await advanceDuel(room.id);
    }
    return json({ room: await roomState(code, token) });
  }

  if (["respond_group", "take_group_damage"].includes(action)) {
    if (!me) return json({ error: "Your player session is no longer valid." }, 403);
    const liveRoom = await db.prepare("SELECT * FROM rooms WHERE id = ?").bind(room.id).first<RoomRow>(); const pending = parse<Pending | null>(liveRoom?.pending_json ?? null, null);
    if (!liveRoom || liveRoom.phase !== "response" || pending?.kind !== "group" || pending.actorId !== me.id) return json({ error: "You are not the acting player for this global card response." }, 409);
    let hand = parse<Card[]>(me.hand_json, []); const discard = parse<Card[]>(liveRoom.discard_json, []); let log = parse<string[]>(liveRoom.log_json, []);
    const source = await db.prepare("SELECT * FROM players WHERE id = ?").bind(pending.sourceId).first<PlayerRow>();
    if (!source) return json({ error: "The card source is no longer available." }, 409);
    const selectedResponse = action === "respond_group" ? hand.find((card) => card.id === String(body.cardId ?? "") && (pending.requiredKind === "Attack" ? isAttackCard(card) : card.kind === "Dodge")) : null; const serpentCards = action === "respond_group" && pending.requiredKind === "Attack" && !selectedResponse ? selectedSerpentSpearCards(me, hand, body.cardIds) : [];
    if (action === "respond_group" && !selectedResponse && serpentCards.length !== 2) return json({ error: `Select a ${pending.requiredKind}${pending.requiredKind === "Attack" ? ", or use Serpent Spear with exactly 2 hand cards" : " card from your hand first"}.` }, 409);
    const claim = await db.prepare("UPDATE rooms SET phase = 'resolving' WHERE id = ? AND phase = 'response' AND pending_json = ?").bind(room.id, liveRoom.pending_json).run();
    if ((claim.meta.changes ?? 0) <= 0) return json({ error: "That global card response has already been resolved." }, 409);
    const rows = await db.prepare("SELECT * FROM players WHERE room_id = ? ORDER BY seat").bind(room.id).all<PlayerRow>(); const players = rows.results ?? [];
    if (!selectedResponse && !serpentCards.length) {
      await resolveGroupDamage(liveRoom, pending, me, source, players, discard, log);
    } else {
      const responseCards = selectedResponse ? [selectedResponse] : serpentCards; const responseIds = new Set(responseCards.map((card) => card.id)); hand = hand.filter((card) => !responseIds.has(card.id)); const nextPending = appendHeldGroupCards(pending, responseCards);
      log = selectedResponse ? addCardEvent(log, me.name, selectedResponse) : addCardGroupEvent(log, me.name, responseCards, "play"); log = addLog(log, selectedResponse ? `${me.name} plays ${pending.requiredKind} against ${pending.cardKind === "BarbarianInvasion" ? "Barbarian Invasion" : "Raining Arrows"}.` : `${me.name} discards 2 cards with Serpent Spear to form an Attack against Barbarian Invasion.`);
      await finishGroupStep(liveRoom, nextPending, players, discard, log, [db.prepare("UPDATE players SET hand_json = ? WHERE id = ?").bind(JSON.stringify(hand), me.id)]);
    }
    return json({ room: await roomState(code, token) });
  }

  if (["respond_green_dragon", "pass_green_dragon"].includes(action)) {
    if (!me) return json({ error: "Your player session is no longer valid." }, 403);
    const liveRoom = await db.prepare("SELECT * FROM rooms WHERE id = ?").bind(room.id).first<RoomRow>(); const pending = parse<Pending | null>(liveRoom?.pending_json ?? null, null);
    if (!liveRoom || liveRoom.phase !== "response" || pending?.kind !== "green_dragon" || pending.actorId !== me.id) return json({ error: "You are not the acting player for this Green Dragon Blade response." }, 409);
    const hand = parse<Card[]>(me.hand_json, []); const attack = action === "respond_green_dragon" ? hand.find((card) => card.id === String(body.cardId ?? "") && isAttackCard(card)) : null;
    if (action === "respond_green_dragon" && !attack) return json({ error: "Select an Attack card from your hand first." }, 409);
    const claim = await db.prepare("UPDATE rooms SET phase = 'resolving' WHERE id = ? AND phase = 'response' AND pending_json = ?").bind(room.id, liveRoom.pending_json).run();
    if ((claim.meta.changes ?? 0) <= 0) return json({ error: "That Green Dragon Blade decision has already moved on." }, 409);
    if (!attack) {
      const log = addLog(parse<string[]>(liveRoom.log_json, []), `${me.name} does not continue with Green Dragon Blade.`);
      await db.prepare("UPDATE rooms SET phase = ?, pending_json = NULL, log_json = ? WHERE id = ?").bind(pending.resumePhase, JSON.stringify(log), room.id).run();
      await continueAfterDying(room.id, me.id);
    } else {
      const rows = await db.prepare("SELECT * FROM players WHERE room_id = ? ORDER BY seat").bind(room.id).all<PlayerRow>(); const players = rows.results ?? [];
      const target = players.find((player) => player.id === pending.targetId && player.alive);
      if (!target || !hasGreenDragonBlade(me)) {
        const log = addLog(parse<string[]>(liveRoom.log_json, []), "The Green Dragon Blade follow-up no longer has a valid target or equipped weapon.");
        await db.prepare("UPDATE rooms SET phase = ?, pending_json = NULL, log_json = ? WHERE id = ?").bind(pending.resumePhase, JSON.stringify(log), room.id).run();
      } else await resolveGreenDragonAttack(liveRoom, pending, me, target, players, attack, hand, parse<Card[]>(liveRoom.discard_json, []), parse<string[]>(liveRoom.log_json, []));
    }
    return json({ room: await roomState(code, token) });
  }

  if (["respond_rock_cleaving", "pass_rock_cleaving"].includes(action)) {
    if (!me) return json({ error: "Your player session is no longer valid." }, 403);
    const liveRoom = await db.prepare("SELECT * FROM rooms WHERE id = ?").bind(room.id).first<RoomRow>(); const pending = parse<Pending | null>(liveRoom?.pending_json ?? null, null);
    if (!liveRoom || liveRoom.phase !== "response" || pending?.kind !== "rock_cleaving" || pending.actorId !== me.id) return json({ error: "You are not the acting player for this Rock Cleaving Axe response." }, 409);
    const hand = parse<Card[]>(me.hand_json, []); const materials = action === "respond_rock_cleaving" ? selectedRockCleavingCards(me, hand, body.cardIds) : [];
    if (action === "respond_rock_cleaving" && materials.length !== 2) return json({ error: "Select 2 different cards from your hand or Equipment Zone first." }, 409);
    const claim = await db.prepare("UPDATE rooms SET phase = 'resolving' WHERE id = ? AND phase = 'response' AND pending_json = ?").bind(room.id, liveRoom.pending_json).run();
    if ((claim.meta.changes ?? 0) <= 0) return json({ error: "That Rock Cleaving Axe decision has already moved on." }, 409);
    if (!materials.length) {
      const log = addLog(parse<string[]>(liveRoom.log_json, []), `${me.name} does not use Rock Cleaving Axe.`);
      await db.prepare("UPDATE rooms SET phase = ?, pending_json = NULL, log_json = ? WHERE id = ?").bind(pending.resumePhase, JSON.stringify(log), room.id).run();
      await continueAfterDying(room.id, me.id);
    } else {
      const rows = await db.prepare("SELECT * FROM players WHERE room_id = ? ORDER BY seat").bind(room.id).all<PlayerRow>(); const players = rows.results ?? [];
      const target = players.find((player) => player.id === pending.targetId && player.alive);
      if (!target || !hasRockCleavingAxe(me)) {
        const log = addLog(parse<string[]>(liveRoom.log_json, []), "The Rock Cleaving Axe response no longer has a valid target or equipped weapon.");
        await db.prepare("UPDATE rooms SET phase = ?, pending_json = NULL, log_json = ? WHERE id = ?").bind(pending.resumePhase, JSON.stringify(log), room.id).run();
      } else await resolveRockCleaving(liveRoom, pending, me, target, players, materials, hand, parse<Card[]>(liveRoom.discard_json, []), parse<string[]>(liveRoom.log_json, []));
    }
    return json({ room: await roomState(code, token) });
  }

  if (["respond_dodge", "take_damage"].includes(action)) {
    if (!me) return json({ error: "Your player session is no longer valid." }, 403);
    const liveRoom = await db.prepare("SELECT * FROM rooms WHERE id = ?").bind(room.id).first<RoomRow>(); const pending = parse<Pending | null>(liveRoom?.pending_json ?? null, null);
    if (!liveRoom || liveRoom.phase !== "response" || pending?.kind !== "attack" || pending.actorId !== me.id) return json({ error: "You are not the acting player for this Attack response." }, 409);
    let hand = parse<Card[]>(me.hand_json, []); const discard = parse<Card[]>(liveRoom.discard_json, []); let log = parse<string[]>(liveRoom.log_json, []); const source = await db.prepare("SELECT * FROM players WHERE id = ?").bind(pending.sourceId).first<PlayerRow>();
    const selectedDodge = action === "respond_dodge" ? hand.find((card) => card.id === String(body.cardId ?? "") && card.kind === "Dodge") : null;
    if (action === "respond_dodge" && !selectedDodge) return json({ error: "Select a Dodge card from your hand first." }, 409);
    const claim = await db.prepare("UPDATE rooms SET phase = 'resolving' WHERE id = ? AND phase = 'response' AND pending_json = ?").bind(room.id, liveRoom.pending_json).run(); if ((claim.meta.changes ?? 0) <= 0) return json({ error: "That Attack response has already been resolved." }, 409);
    if (action === "respond_dodge") {
      const dodge = selectedDodge as Card;
      hand = hand.filter((card) => card.id !== dodge.id); discard.push(dodge); log = addCardEvent(log, me.name, dodge, source?.name ?? "Attack"); log = addLog(log, `${me.name} plays Dodge and blocks the Attack. Action returns to ${source?.name ?? "the turn owner"}.`);
      await finishDodgedAttack(liveRoom, source, { ...me, hand_json: JSON.stringify(hand) }, discard, log, pending.resumePhase ?? phaseAfterAttack(source), pending.sequenceStartCardId ?? "", [db.prepare("UPDATE players SET hand_json = ? WHERE id = ?").bind(JSON.stringify(hand), me.id)]);
    } else {
      const hp = Math.max(0, (me.hp ?? 1) - 1);
      if (hp === 0) {
        if (!source) return json({ error: "The Attack source is no longer available." }, 409);
        const rows = await db.prepare("SELECT * FROM players WHERE room_id = ? ORDER BY seat").bind(room.id).all<PlayerRow>(); log = addLog(log, `${me.name} takes 1 damage and enters Dying. Peach rescue begins in turn order.`);
        await startDyingRescue(liveRoom, source, me, rows.results ?? [], parse<Card[]>(liveRoom.deck_json, []), discard, log, [], source, pending.resumePhase ?? phaseAfterAttack(source));
        return json({ room: await roomState(code, token) });
      } else {
        log = addLog(log, `${me.name} takes 1 damage. Action returns to ${source?.name ?? "the turn owner"}.`);
        await db.batch([db.prepare("UPDATE players SET hp = ? WHERE id = ?").bind(hp, me.id), db.prepare("UPDATE rooms SET phase = ?, pending_json = NULL, log_json = ? WHERE id = ?").bind(pending.resumePhase ?? phaseAfterAttack(source), JSON.stringify(log), room.id)]);
      }
    }
    if (source && action !== "respond_dodge") await continueAfterDying(room.id, source.id);
    return json({ room: await roomState(code, token) });
  }

  if (action === "start_rescue_timer") {
    if (!me) return json({ error: "Your player session is no longer valid." }, 403);
    const liveRoom = await db.prepare("SELECT * FROM rooms WHERE id = ?").bind(room.id).first<RoomRow>(); const pending = parse<Pending | null>(liveRoom?.pending_json ?? null, null);
    if (!liveRoom || liveRoom.phase !== "dying" || pending?.kind !== "dying" || pending.actorId !== me.id) return json({ error: "You are not the acting player for this Peach rescue decision." }, 409);
    if (pending.deadline <= 0) {
      const timedPending: DyingPending = { ...pending, deadline: Date.now() + 5000 };
      await db.prepare("UPDATE rooms SET pending_json = ? WHERE id = ? AND phase = 'dying' AND pending_json = ?").bind(JSON.stringify(timedPending), room.id, liveRoom.pending_json).run();
    }
    return json({ room: await roomState(code, token) });
  }

  if (["give_peach", "skip_rescue"].includes(action)) {
    if (!me) return json({ error: "Your player session is no longer valid." }, 403);
    const liveRoom = await db.prepare("SELECT * FROM rooms WHERE id = ?").bind(room.id).first<RoomRow>(); const pending = parse<Pending | null>(liveRoom?.pending_json ?? null, null);
    if (!liveRoom || liveRoom.phase !== "dying" || pending?.kind !== "dying" || pending.actorId !== me.id) {
      if (action === "skip_rescue") return json({ room: await roomState(code, token) });
      return json({ error: "You are not the acting player for this Peach rescue decision." }, 409);
    }
    let hand = parse<Card[]>(me.hand_json, []); const target = await db.prepare("SELECT * FROM players WHERE id = ?").bind(pending.targetId).first<PlayerRow>(); const source = await db.prepare("SELECT * FROM players WHERE id = ?").bind(pending.sourceId).first<PlayerRow>(); const resume = await db.prepare("SELECT * FROM players WHERE id = ?").bind(pending.resumePlayerId).first<PlayerRow>();
    const peach = action === "give_peach" ? hand.find((card) => card.id === String(body.cardId ?? "") && card.kind === "Peach") : null;
    if (action === "give_peach" && !peach) return json({ error: "Select the Peach card you want to give." }, 409);
    const claim = await db.prepare("UPDATE rooms SET phase = 'resolving' WHERE id = ? AND phase = 'dying' AND pending_json = ?").bind(room.id, liveRoom.pending_json).run(); if ((claim.meta.changes ?? 0) <= 0) return json({ error: "That Peach rescue decision has already moved on." }, 409);
    if (peach) {
      hand = hand.filter((card) => card.id !== peach.id); const resumedPending = appendDyingSequenceCard(pending, peach); const discard = pending.resumePending ? parse<Card[]>(liveRoom.discard_json, []) : [...parse<Card[]>(liveRoom.discard_json, []), peach]; let log = parse<string[]>(liveRoom.log_json, []); log = addCardEvent(log, me.name, peach, target?.name ?? "the dying player"); log = addLog(log, `${me.name} gives Peach to ${target?.name ?? "the dying player"}, restoring them to 1 HP.`);
      const next = dyingResumeState(resumedPending, resume);
      await db.batch([db.prepare("UPDATE players SET hand_json = ? WHERE id = ?").bind(JSON.stringify(hand), me.id), db.prepare("UPDATE players SET hp = 1, alive = 1 WHERE id = ?").bind(pending.targetId), db.prepare("UPDATE rooms SET phase = ?, pending_json = ?, discard_json = ?, log_json = ? WHERE id = ?").bind(next.phase, next.pendingJson, JSON.stringify(discard), JSON.stringify(log), room.id)]);
      await continueDyingResolution(room.id, resumedPending);
    } else if (pending.remainingIds[0]) {
      const nextPending: DyingPending = { ...pending, actorId: pending.remainingIds[0], remainingIds: pending.remainingIds.slice(1), deadline: 0, reason: `Decide whether to give Peach to ${target?.name ?? "the dying player"}` };
      await db.prepare("UPDATE rooms SET phase = 'dying', pending_json = ? WHERE id = ? AND phase = 'resolving'").bind(JSON.stringify(nextPending), room.id).run(); const immediateRoom = await roomState(code, token); await continueInBackground(() => advanceDyingRescue(room.id)); return json({ room: immediateRoom });
    } else {
      await defeatDyingPlayer(liveRoom, pending, target, source);
    }
    return json({ room: await roomState(code, token) });
  }

  if (["draw", "play_card", "serpent_spear_attack", "end_turn"].includes(action)) {
    if (!me) return json({ error: "Your player session is no longer valid." }, 403);
    const liveRoom = await db.prepare("SELECT * FROM rooms WHERE id = ?").bind(room.id).first<RoomRow>();
    if (!liveRoom || liveRoom.status !== "playing") return json({ error: "The match is not currently playing." }, 409);
    if (liveRoom.turn_seat !== me.seat || !me.alive) return json({ error: "Wait for your turn." }, 409);
    let deck = parse<Card[]>(liveRoom.deck_json, []); let discard = parse<Card[]>(liveRoom.discard_json, []); let log = parse<string[]>(liveRoom.log_json, []); let hand = parse<Card[]>(me.hand_json, []); let drawnCards: Card[] = [];

    if (action === "draw") {
      if (!liveRoom.phase?.startsWith("draw")) return json({ error: "You have already drawn this turn." }, 409);
      if (!await claimTurnAction(room.id, me.seat, liveRoom.phase)) return json({ error: "The turn changed before that action completed. Refreshing the table." }, 409);
      const delayed = parse<Card[]>(me.judgement_json, [])[0] ?? null;
      if (delayed) {
        const rows = await db.prepare("SELECT * FROM players WHERE room_id = ? ORDER BY seat").bind(room.id).all<PlayerRow>();
        if (await startJudgementNegation(liveRoom, me, rows.results ?? [], delayed, deck, discard, log)) return json({ room: await roomState(code, token) });
      }
      const rows = await db.prepare("SELECT * FROM players WHERE room_id = ? ORDER BY seat").bind(room.id).all<PlayerRow>(); const players = rows.results ?? [];
      const judgement = resolveTurnJudgement(me, players, deck, discard, log); const priorFlags = drawPhaseFlags(liveRoom.phase); deck = judgement.deck; discard = judgement.discard; log = judgement.log; judgement.skipPlay ||= priorFlags.skipPlay; judgement.skipDraw ||= priorFlags.skipDraw;
      const judgementWrites: D1PreparedStatement[] = [db.prepare("UPDATE players SET judgement_json = ? WHERE id = ?").bind(JSON.stringify(judgement.remaining), me.id)];
      if (judgement.transferTarget && judgement.transferredCard) {
        const transferred = [...parse<Card[]>(judgement.transferTarget.judgement_json, []), judgement.transferredCard];
        judgementWrites.push(db.prepare("UPDATE players SET judgement_json = ? WHERE id = ?").bind(JSON.stringify(transferred), judgement.transferTarget.id));
      }
      if (judgement.damage > 0) {
        const hp = Math.max(0, (me.hp ?? 1) - judgement.damage);
        if (hp === 0) {
          log = addLog(log, `${me.name} enters Dying from Lightning. Peach rescue begins in turn order.`);
          await startDyingRescue(liveRoom, null, me, players, deck, discard, log, judgementWrites, me, drawPhaseFor(judgement.skipPlay, judgement.skipDraw));
          return json({ room: await roomState(code, token) });
        }
        judgementWrites.push(db.prepare("UPDATE players SET hp = ? WHERE id = ?").bind(hp, me.id));
      }
      if (judgement.remaining.length) {
        judgementWrites.push(db.prepare("UPDATE rooms SET phase = ?, deck_json = ?, discard_json = ?, log_json = ? WHERE id = ?").bind(drawPhaseFor(judgement.skipPlay, judgement.skipDraw), JSON.stringify(deck), JSON.stringify(discard), JSON.stringify(log), room.id));
        await db.batch(judgementWrites);
        return json({ room: await roomState(code, token) });
      }
      if (judgement.skipDraw) log = addLog(log, `${me.name} skips the Draw Phase because of Rations Depleted.`);
      else { const draw = drawCards(deck, discard, 2, log); deck = draw.deck; discard = draw.discard; log = addHistory(draw.log, `${me.name} draws ${draw.drawn.length === 2 ? "two cards" : `${draw.drawn.length} card${draw.drawn.length === 1 ? "" : "s"}`}.`); hand.push(...draw.drawn); drawnCards = draw.drawn; }
      await db.batch([...judgementWrites, db.prepare("UPDATE players SET hand_json = ? WHERE id = ?").bind(JSON.stringify(hand), me.id), db.prepare("UPDATE rooms SET phase = ?, deck_json = ?, discard_json = ?, log_json = ? WHERE id = ?").bind(judgement.skipPlay ? "discard" : "play", JSON.stringify(deck), JSON.stringify(discard), JSON.stringify(log), room.id)]);
    } else if (action === "serpent_spear_attack") {
      if (!liveRoom.phase?.startsWith("play")) return json({ error: "Draw before forming an Attack." }, 409);
      if (liveRoom.phase === "play-struck" && me.hero !== "zhang-fei" && !hasZhugeCrossbow(me)) return json({ error: "You may use only one Attack per turn." }, 409);
      const materials = selectedSerpentSpearCards(me, hand, body.cardIds);
      if (materials.length !== 2) return json({ error: "Equip Serpent Spear and select exactly 2 different hand cards." }, 409);
      const targetId = String(body.targetId ?? ""); const target = await db.prepare("SELECT * FROM players WHERE room_id = ? AND id = ?").bind(room.id, targetId).first<PlayerRow>();
      if (!target || !target.alive || target.id === me.id) return json({ error: "Choose a living opponent as the target." }, 400);
      const rows = await db.prepare("SELECT * FROM players WHERE room_id = ? ORDER BY seat").bind(room.id).all<PlayerRow>(); const players = rows.results ?? [];
      if (distanceBetween(players, me.id, target.id) > attackRangeFor(me)) return json({ error: `That opponent is out of range. Your current Attack Range is ${attackRangeFor(me)}.` }, 409);
      if (!await claimTurnAction(room.id, me.seat, liveRoom.phase)) return json({ error: "The turn changed before that action completed. Refreshing the table." }, 409);
      const materialIds = new Set(materials.map((item) => item.id)); hand = hand.filter((item) => !materialIds.has(item.id)); discard.push(...materials);
      log = addCardGroupEvent(log, me.name, materials, "play", true, target.name); log = addLog(log, `${me.name} discards 2 cards with Serpent Spear to form an Attack on ${target.name}.`);
      let targetHand = parse<Card[]>(target.hand_json, []); const dodge = targetHand.find((item) => item.kind === "Dodge"); const sequenceStartCardId = materials[0].id;
      if (!isBotPlayer(target)) {
        log = addLog(log, `Action passes from ${me.name} to ${target.name} for Dodge response.`);
        await db.batch([db.prepare("UPDATE players SET hand_json = ? WHERE id = ?").bind(JSON.stringify(hand), me.id), db.prepare("UPDATE rooms SET phase = 'response', pending_json = ?, discard_json = ?, log_json = ? WHERE id = ?").bind(JSON.stringify({ kind: "attack", sourceId: me.id, targetId: target.id, actorId: target.id, resumePhase: phaseAfterAttack(me), sequenceStartCardId, reason: "Respond to Attack: play Dodge or skip and take 1 damage" } satisfies AttackPending), JSON.stringify(discard), JSON.stringify(log), room.id)]);
      } else if (dodge) {
        targetHand = targetHand.filter((item) => item.id !== dodge.id); discard.push(dodge); log = addCardEvent(log, target.name, dodge, me.name); log = addLog(log, `${target.name} plays Dodge and blocks the formed Attack.`);
        await finishDodgedAttack(liveRoom, { ...me, hand_json: JSON.stringify(hand) }, { ...target, hand_json: JSON.stringify(targetHand) }, discard, log, phaseAfterAttack(me), sequenceStartCardId, [db.prepare("UPDATE players SET hand_json = ? WHERE id = ?").bind(JSON.stringify(hand), me.id), db.prepare("UPDATE players SET hand_json = ? WHERE id = ?").bind(JSON.stringify(targetHand), target.id)]);
      } else {
        const hp = Math.max(0, (target.hp ?? 1) - 1); log = addLog(log, `${target.name} takes 1 damage${hp === 0 ? " and enters Dying. Peach rescue begins in turn order." : `. Action returns to ${me.name}.`}`);
        if (hp === 0) await startDyingRescue(liveRoom, me, target, players, deck, discard, log, [db.prepare("UPDATE players SET hand_json = ? WHERE id = ?").bind(JSON.stringify(hand), me.id)]);
        else await db.batch([db.prepare("UPDATE players SET hand_json = ? WHERE id = ?").bind(JSON.stringify(hand), me.id), db.prepare("UPDATE players SET hp = ? WHERE id = ?").bind(hp, target.id), db.prepare("UPDATE rooms SET phase = ?, pending_json = NULL, discard_json = ?, log_json = ? WHERE id = ?").bind(phaseAfterAttack(me), JSON.stringify(discard), JSON.stringify(log), room.id)]);
      }
    } else if (action === "play_card") {
      if (!liveRoom.phase?.startsWith("play")) return json({ error: "Draw before playing a card." }, 409);
      const card = hand.find((item) => item.id === String(body.cardId ?? ""));
      if (!card) return json({ error: "That card is not in your hand." }, 400);
      if (card.kind === "Dodge") return json({ error: "Dodge can only be played while answering an Attack." }, 400);
      if (card.kind === "Negation") return json({ error: "Negation can only be played while answering a stratagem." }, 400);
      if (card.kind === "Peach") {
        if ((me.hp ?? 0) >= (me.max_hp ?? 0)) return json({ error: "You are already at full health." }, 409);
        if (!await claimTurnAction(room.id, me.seat, liveRoom.phase)) return json({ error: "The turn changed before that action completed. Refreshing the table." }, 409);
        hand = hand.filter((item) => item.id !== card.id); discard.push(card); log = addCardEvent(log, me.name, card); log = addLog(log, `${me.name} plays Peach and recovers 1 HP.`);
        await db.batch([db.prepare("UPDATE players SET hand_json = ?, hp = hp + 1 WHERE id = ?").bind(JSON.stringify(hand), me.id), db.prepare("UPDATE rooms SET phase = ?, discard_json = ?, log_json = ? WHERE id = ?").bind(liveRoom.phase, JSON.stringify(discard), JSON.stringify(log), room.id)]);
      } else if (cardDefinition(card.kind).equipmentSlot === "weapon") {
        if (!await claimTurnAction(room.id, me.seat, liveRoom.phase)) return json({ error: "The turn changed before that action completed. Refreshing the table." }, 409);
        const equipment = equipmentZone(me); const replacedWeapon = equipment.weapon;
        hand = hand.filter((item) => item.id !== card.id); equipment.weapon = card;
        if (replacedWeapon) { discard.push(replacedWeapon); log = addCardEvent(log, me.name, replacedWeapon, me.name, "discard", false); }
        log = addCardEvent(log, me.name, card, me.name, "equip"); log = addLog(log, `${me.name} equips ${cardDefinition(card.kind).name}${replacedWeapon ? ` and discards ${cardDefinition(replacedWeapon.kind).name}` : ""}.`);
        await db.batch([
          db.prepare("UPDATE players SET hand_json = ?, equipment_json = ? WHERE id = ?").bind(JSON.stringify(hand), JSON.stringify(equipment), me.id),
          db.prepare("UPDATE rooms SET phase = ?, discard_json = ?, log_json = ? WHERE id = ?").bind(liveRoom.phase, JSON.stringify(discard), JSON.stringify(log), room.id),
        ]);
      } else if (card.kind === "DrawTwo") {
        if (!await claimTurnAction(room.id, me.seat, liveRoom.phase)) return json({ error: "The turn changed before that action completed. Refreshing the table." }, 409);
        hand = hand.filter((item) => item.id !== card.id); discard.push(card); log = addCardEvent(log, me.name, card);
        const rows = await db.prepare("SELECT * FROM players WHERE room_id = ? ORDER BY seat").bind(room.id).all<PlayerRow>();
        drawnCards = await startNegation(liveRoom, me, rows.results ?? [], card, me.name, me.id, { kind: "draw_two", cardId: card.id }, hand, deck, discard, log);
      } else if (card.kind === "Oath") {
        const rows = await db.prepare("SELECT * FROM players WHERE room_id = ? ORDER BY seat").bind(room.id).all<PlayerRow>();
        if (!await claimTurnAction(room.id, me.seat, liveRoom.phase)) return json({ error: "The turn changed before that action completed. Refreshing the table." }, 409);
        hand = hand.filter((item) => item.id !== card.id); discard.push(card);
        log = addCardEvent(log, me.name, card, "All living players"); log = addLog(log, `${me.name} plays Oath of the Peach Garden.`);
        await startNegation(liveRoom, me, rows.results ?? [], card, "all living players", me.id, { kind: "oath" }, hand, deck, discard, log);
      } else if (card.kind === "BumperHarvest") {
        const rows = await db.prepare("SELECT * FROM players WHERE room_id = ? ORDER BY seat").bind(room.id).all<PlayerRow>();
        const players = rows.results ?? []; const choosersInOrder = playersInTurnOrder(players, me.seat);
        if (!choosersInOrder.length) return json({ error: "There are no living characters to take part in Bumper Harvest." }, 409);
        if (!await claimTurnAction(room.id, me.seat, liveRoom.phase)) return json({ error: "The turn changed before that action completed. Refreshing the table." }, 409);
        hand = hand.filter((item) => item.id !== card.id); log = addCardEvent(log, me.name, card, "All living players");
        const draw = drawCards(deck, discard, choosersInOrder.length, log); deck = draw.deck; discard = draw.discard; log = addCardGroupEvent(draw.log, me.name, draw.drawn, "reveal", false);
        const choosers = choosersInOrder.slice(0, draw.drawn.length);
        log = addHistory(log, `${me.name} reveals ${draw.drawn.length} card${draw.drawn.length === 1 ? "" : "s"} for Bumper Harvest. ${choosers[0]?.name ?? "No player"} resolves first.`);
        const harvest: HarvestPending = { kind: "harvest", sourceId: me.id, actorId: choosers[0]?.id ?? me.id, remainingIds: choosers.slice(1).map((player) => player.id), revealed: draw.drawn, availableIds: draw.drawn.map((revealed) => revealed.id), choices: [], resumePhase: liveRoom.phase ?? "play", reason: "Choose 1 revealed card from Bumper Harvest", heldCards: [card] };
        await beginHarvestTarget(liveRoom, harvest, players.map((player) => player.id === me.id ? { ...player, hand_json: JSON.stringify(hand) } : player), deck, discard, log, [db.prepare("UPDATE players SET hand_json = ? WHERE id = ?").bind(JSON.stringify(hand), me.id)]);
      } else if (card.kind === "BarbarianInvasion" || card.kind === "RainingArrows") {
        const rows = await db.prepare("SELECT * FROM players WHERE room_id = ? ORDER BY seat").bind(room.id).all<PlayerRow>(); const players = rows.results ?? [];
        const targets = playersInTurnOrder(players, me.seat).filter((player) => player.id !== me.id);
        if (!targets.length) return json({ error: "There are no other living characters to target." }, 409);
        if (!await claimTurnAction(room.id, me.seat, liveRoom.phase)) return json({ error: "The turn changed before that action completed. Refreshing the table." }, 409);
        hand = hand.filter((item) => item.id !== card.id);
        const requiredKind = card.kind === "BarbarianInvasion" ? "Attack" : "Dodge"; const cardName = card.kind === "BarbarianInvasion" ? "Barbarian Invasion" : "Raining Arrows";
        log = addCardEvent(log, me.name, card, "All other players"); log = addLog(log, `${me.name} plays ${cardName}.`);
        const pending: GroupPending = { kind: "group", cardKind: card.kind, sourceId: me.id, actorId: targets[0].id, remainingIds: targets.slice(1).map((player) => player.id), requiredKind, resumePhase: liveRoom.phase, reason: `Respond to ${cardName}: select ${requiredKind} or take 1 damage`, heldCards: [card] };
        await beginGroupTarget(liveRoom, pending, players.map((player) => player.id === me.id ? { ...player, hand_json: JSON.stringify(hand) } : player), discard, log, [db.prepare("UPDATE players SET hand_json = ? WHERE id = ?").bind(JSON.stringify(hand), me.id), db.prepare("UPDATE rooms SET deck_json = ? WHERE id = ?").bind(JSON.stringify(deck), room.id)]);
      } else if (card.kind === "Lightning") {
        if (parse<Card[]>(me.judgement_json, []).some((delayed) => delayed.kind === "Lightning")) return json({ error: "You already have Lightning in your Judgement Zone." }, 409);
        if (!await claimTurnAction(room.id, me.seat, liveRoom.phase)) return json({ error: "The turn changed before that action completed. Refreshing the table." }, 409);
        hand = hand.filter((item) => item.id !== card.id); discard.push(card); log = addCardEvent(log, me.name, card); log = addLog(log, `${me.name} plays Lightning into their own Judgement Zone.`);
        const rows = await db.prepare("SELECT * FROM players WHERE room_id = ? ORDER BY seat").bind(room.id).all<PlayerRow>();
        await startNegation(liveRoom, me, rows.results ?? [], card, me.name, me.id, { kind: "lightning", targetId: me.id, cardId: card.id }, hand, deck, discard, log);
      } else if (card.kind === "Overindulgence") {
        const targetId = String(body.targetId ?? ""); const target = await db.prepare("SELECT * FROM players WHERE room_id = ? AND id = ?").bind(room.id, targetId).first<PlayerRow>();
        if (!target || !target.alive || target.id === me.id) return json({ error: "Choose another living character for Overindulgence." }, 400);
        if (parse<Card[]>(target.judgement_json, []).some((delayed) => delayed.kind === "Overindulgence")) return json({ error: `${target.name} already has Overindulgence in their Judgement Zone.` }, 409);
        if (!await claimTurnAction(room.id, me.seat, liveRoom.phase)) return json({ error: "The turn changed before that action completed. Refreshing the table." }, 409);
        hand = hand.filter((item) => item.id !== card.id); discard.push(card); log = addCardEvent(log, me.name, card, target.name);
        const rows = await db.prepare("SELECT * FROM players WHERE room_id = ? ORDER BY seat").bind(room.id).all<PlayerRow>();
        await startNegation(liveRoom, me, rows.results ?? [], card, target.name, target.id, { kind: "overindulgence", targetId: target.id, cardId: card.id }, hand, deck, discard, log);
      } else if (card.kind === "RationsDepleted") {
        const targetId = String(body.targetId ?? ""); const target = await db.prepare("SELECT * FROM players WHERE room_id = ? AND id = ?").bind(room.id, targetId).first<PlayerRow>();
        if (!target || !target.alive || target.id === me.id) return json({ error: "Choose another living character for Rations Depleted." }, 400);
        const rows = await db.prepare("SELECT * FROM players WHERE room_id = ? ORDER BY seat").bind(room.id).all<PlayerRow>();
        if (distanceBetween(rows.results ?? [], me.id, target.id) > 1) return json({ error: "Rations Depleted can target only a character within distance 1." }, 409);
        if (parse<Card[]>(target.judgement_json, []).some((delayed) => delayed.kind === "RationsDepleted")) return json({ error: `${target.name} already has Rations Depleted in their Judgement Zone.` }, 409);
        if (!await claimTurnAction(room.id, me.seat, liveRoom.phase)) return json({ error: "The turn changed before that action completed. Refreshing the table." }, 409);
        hand = hand.filter((item) => item.id !== card.id); discard.push(card); log = addCardEvent(log, me.name, card, target.name);
        await startNegation(liveRoom, me, rows.results ?? [], card, target.name, target.id, { kind: "rations_depleted", targetId: target.id, cardId: card.id }, hand, deck, discard, log);
      } else if (card.kind === "Dismantle") {
        const targetId = String(body.targetId ?? ""); const target = await db.prepare("SELECT * FROM players WHERE room_id = ? AND id = ?").bind(room.id, targetId).first<PlayerRow>();
        if (!target || !target.alive || target.id === me.id) return json({ error: "Choose a living opponent for Burning Bridges." }, 400);
        if (targetableCardCount(target) === 0) return json({ error: "Choose a player who currently has at least one card." }, 400);
        if (!await claimTurnAction(room.id, me.seat, liveRoom.phase)) return json({ error: "The turn changed before that action completed. Refreshing the table." }, 409);
        hand = hand.filter((item) => item.id !== card.id); discard.push(card); log = addCardEvent(log, me.name, card, target.name);
        const rows = await db.prepare("SELECT * FROM players WHERE room_id = ? ORDER BY seat").bind(room.id).all<PlayerRow>();
        await startNegation(liveRoom, me, rows.results ?? [], card, target.name, target.id, { kind: "dismantle", targetId: target.id }, hand, deck, discard, log);
      } else if (card.kind === "Steal") {
        const targetId = String(body.targetId ?? ""); const target = await db.prepare("SELECT * FROM players WHERE room_id = ? AND id = ?").bind(room.id, targetId).first<PlayerRow>();
        if (!target || !target.alive || target.id === me.id) return json({ error: "Choose a living opponent for Steal." }, 400);
        const rows = await db.prepare("SELECT * FROM players WHERE room_id = ? ORDER BY seat").bind(room.id).all<PlayerRow>();
        if (distanceBetween(rows.results ?? [], me.id, target.id) > 1) return json({ error: "Steal can target only a character within distance 1." }, 409);
        if (targetableCardCount(target) === 0) return json({ error: "Choose a player who currently has at least one card." }, 400);
        if (!await claimTurnAction(room.id, me.seat, liveRoom.phase)) return json({ error: "The turn changed before that action completed. Refreshing the table." }, 409);
        hand = hand.filter((item) => item.id !== card.id); discard.push(card); log = addCardEvent(log, me.name, card, target.name);
        await startNegation(liveRoom, me, rows.results ?? [], card, target.name, target.id, { kind: "steal", targetId: target.id }, hand, deck, discard, log);
      } else if (card.kind === "Duel") {
        const targetId = String(body.targetId ?? ""); const target = await db.prepare("SELECT * FROM players WHERE room_id = ? AND id = ?").bind(room.id, targetId).first<PlayerRow>();
        if (!target || !target.alive || target.id === me.id) return json({ error: "Choose a living opponent for Duel." }, 400);
        if (!await claimTurnAction(room.id, me.seat, liveRoom.phase)) return json({ error: "The turn changed before that action completed. Refreshing the table." }, 409);
        hand = hand.filter((item) => item.id !== card.id); discard.push(card);
        log = addCardEvent(log, me.name, card, target.name); log = addLog(log, `${me.name} starts a Duel with ${target.name}.`);
        const pending: DuelPending = { kind: "duel", sourceId: me.id, targetId: target.id, actorId: target.id, opponentId: me.id, resumePhase: liveRoom.phase, reason: "Respond to Duel: select Attack or take 1 damage" };
        const rows = await db.prepare("SELECT * FROM players WHERE room_id = ? ORDER BY seat").bind(room.id).all<PlayerRow>();
        await startNegation(liveRoom, me, rows.results ?? [], card, target.name, target.id, { kind: "duel", pending }, hand, deck, discard, log);
      } else if (isAttackCard(card)) {
        if (liveRoom.phase === "play-struck" && me.hero !== "zhang-fei" && !hasZhugeCrossbow(me)) return json({ error: "You may play only one Attack per turn." }, 409);
        const targetId = String(body.targetId ?? ""); const target = await db.prepare("SELECT * FROM players WHERE room_id = ? AND id = ?").bind(room.id, targetId).first<PlayerRow>();
        if (!target || !target.alive || target.id === me.id) return json({ error: "Choose a living opponent as the target." }, 400);
        const rows = await db.prepare("SELECT * FROM players WHERE room_id = ? ORDER BY seat").bind(room.id).all<PlayerRow>(); if (distanceBetween(rows.results ?? [], me.id, target.id) > attackRangeFor(me)) return json({ error: `That opponent is out of range. Your current Attack Range is ${attackRangeFor(me)}.` }, 409);
        if (!await claimTurnAction(room.id, me.seat, liveRoom.phase)) return json({ error: "The turn changed before that action completed. Refreshing the table." }, 409);
        hand = hand.filter((item) => item.id !== card.id); discard.push(card); log = addCardEvent(log, me.name, card, target.name);
        let targetHand = parse<Card[]>(target.hand_json, []); const dodge = targetHand.find((item) => item.kind === "Dodge");
        if (!isBotPlayer(target)) {
          log = addLog(log, `${me.name} plays Attack on ${target.name}. Action passes from ${me.name} to ${target.name} for Dodge response.`);
          await db.batch([db.prepare("UPDATE players SET hand_json = ? WHERE id = ?").bind(JSON.stringify(hand), me.id), db.prepare("UPDATE rooms SET phase = 'response', pending_json = ?, discard_json = ?, log_json = ? WHERE id = ?").bind(JSON.stringify({ kind: "attack", sourceId: me.id, targetId: target.id, actorId: target.id, resumePhase: phaseAfterAttack(me), sequenceStartCardId: card.id, reason: "Respond to Attack: play Dodge or skip and take 1 damage" } satisfies AttackPending), JSON.stringify(discard), JSON.stringify(log), room.id)]);
        } else if (dodge) {
            targetHand = targetHand.filter((item) => item.id !== dodge.id); discard.push(dodge); log = addCardEvent(log, target.name, dodge, me.name); log = addLog(log, `${target.name} plays Dodge and blocks the Attack.`);
            await finishDodgedAttack(liveRoom, { ...me, hand_json: JSON.stringify(hand) }, { ...target, hand_json: JSON.stringify(targetHand) }, discard, log, phaseAfterAttack(me), card.id, [db.prepare("UPDATE players SET hand_json = ? WHERE id = ?").bind(JSON.stringify(hand), me.id), db.prepare("UPDATE players SET hand_json = ? WHERE id = ?").bind(JSON.stringify(targetHand), target.id)]);
        } else {
          const hp = Math.max(0, (target.hp ?? 1) - 1); log = addLog(log, `${target.name} takes 1 damage${hp === 0 ? " and enters Dying. Peach rescue begins in turn order." : `. Action returns to ${me.name}.`}`);
          if (hp === 0) {
            await startDyingRescue(liveRoom, me, target, rows.results ?? [], deck, discard, log, [db.prepare("UPDATE players SET hand_json = ? WHERE id = ?").bind(JSON.stringify(hand), me.id)]);
          } else {
            await db.batch([db.prepare("UPDATE players SET hand_json = ? WHERE id = ?").bind(JSON.stringify(hand), me.id), db.prepare("UPDATE players SET hp = ? WHERE id = ?").bind(hp, target.id), db.prepare("UPDATE rooms SET phase = ?, pending_json = NULL, discard_json = ?, log_json = ? WHERE id = ?").bind(phaseAfterAttack(me), JSON.stringify(discard), JSON.stringify(log), room.id)]);
          }
        }
      } else {
        return json({ error: "That card is not playable yet." }, 400);
      }
    } else {
      if (!liveRoom.phase?.startsWith("play")) return json({ error: "Only the active player can finish the Play Phase." }, 409);
      if (!await claimTurnAction(room.id, me.seat, liveRoom.phase)) return json({ error: "The turn changed before that action completed. Refreshing the table." }, 409);
      if (hand.length > Math.max(0, me.hp ?? 0)) {
        await db.prepare("UPDATE rooms SET phase = 'discard', log_json = ? WHERE id = ?").bind(JSON.stringify(addLog(log, `${me.name} finishes Play and enters Discard. Keep at most ${me.hp ?? 0} cards.`)), room.id).run();
      } else {
        const rows = await db.prepare("SELECT * FROM players WHERE room_id = ? ORDER BY seat").bind(room.id).all<PlayerRow>(); const next = nextAliveSeat(rows.results ?? [], me.seat);
        await db.prepare("UPDATE rooms SET turn_seat = ?, phase = 'draw', log_json = ? WHERE id = ?").bind(next, JSON.stringify(addLog(log, `${me.name} finishes Play; Ending passes and their turn ends.`)), room.id).run(); const immediateRoom = await roomState(code, token); await continueInBackground(() => runBots(room.id)); return json({ room: immediateRoom });
      }
    }
    return json({ room: await roomState(code, token), ...(drawnCards.length ? { drawnCards } : {}) });
  }

  if (action === "discard_cards") {
    if (!me) return json({ error: "Your player session is no longer valid." }, 403);
    const liveRoom = await db.prepare("SELECT * FROM rooms WHERE id = ?").bind(room.id).first<RoomRow>(); if (!liveRoom || liveRoom.status !== "playing" || liveRoom.turn_seat !== me.seat || liveRoom.phase !== "discard") return json({ error: "You are not in the discard phase." }, 409);
    let hand = parse<Card[]>(me.hand_json, []); const required = Math.max(0, hand.length - (me.hp ?? 0)); const requested = Array.isArray(body.cardIds) ? [...new Set(body.cardIds.map(String))] : [];
    if (requested.length !== required) return json({ error: `Choose exactly ${required} card${required === 1 ? "" : "s"} to discard.` }, 400);
    const selectedCards = requested.map((id) => hand.find((card) => card.id === id)).filter((card): card is Card => Boolean(card)); if (selectedCards.length !== required) return json({ error: "One of those cards is no longer in your hand." }, 409);
    if (!await claimTurnAction(room.id, me.seat, liveRoom.phase)) return json({ error: "The turn changed before that action completed. Refreshing the table." }, 409);
    const selectedIds = new Set(requested); hand = hand.filter((card) => !selectedIds.has(card.id)); const discard = [...parse<Card[]>(liveRoom.discard_json, []), ...selectedCards]; let log = addDiscardEvent(parse<string[]>(liveRoom.log_json, []), me.name, selectedCards); log = addLog(log, `${me.name} discards ${selectedCards.length} selected card${selectedCards.length === 1 ? "" : "s"}.`);
    const rows = await db.prepare("SELECT * FROM players WHERE room_id = ? ORDER BY seat").bind(room.id).all<PlayerRow>(); const next = nextAliveSeat(rows.results ?? [], me.seat); log = addLog(log, `${me.name} completes Discard; Ending passes and their turn ends.`); await db.batch([db.prepare("UPDATE players SET hand_json = ? WHERE id = ?").bind(JSON.stringify(hand), me.id), db.prepare("UPDATE rooms SET turn_seat = ?, phase = 'draw', discard_json = ?, log_json = ? WHERE id = ?").bind(next, JSON.stringify(discard), JSON.stringify(log), room.id)]); const immediateRoom = await roomState(code, token); await continueInBackground(() => runBots(room.id));
    return json({ room: immediateRoom });
  }

  return json({ error: "Unknown action." }, 400);
}
