import assert from "node:assert/strict";
import test from "node:test";
import { decodePublicLog } from "../game/public-log-sequence.ts";
import { legacyLogMessages, roomLogTimeline } from "../game/room-log-decode.ts";

const prefixes = ["@event:", "@card:", "@cards:", "@history:"];

function oldStructuredRecords(log) {
  return log.flatMap((entry, index) => {
    const prefix = prefixes.find((candidate) => entry.startsWith(candidate));
    if (!prefix) return [];
    try {
      const value = JSON.parse(entry.slice(prefix.length));
      return value && typeof value === "object" && !Array.isArray(value) ? [{ index, prefix, value }] : [];
    } catch { return []; }
  });
}

function isPublic(record) {
  return record.prefix !== "@history:" && record.value.presentation !== false && typeof record.value.privateToPlayerId !== "string";
}

function oldPublicSequences(log) {
  const records = oldStructuredRecords(log);
  const hasMetadata = records.some(({ value }) => Object.hasOwn(value, "publicSequenceWatermark") || Object.hasOwn(value, "publicSequence"));
  if (!hasMetadata) return { valid: true, sequences: null, watermark: records.reduce((n, record) => n + (isPublic(record) ? 1 : 0), 0) };
  const sequences = new Map();
  const ids = new Set();
  const seenSequences = new Set();
  let previousWatermark = null;
  for (const record of records) {
    const { value } = record;
    const watermark = value.publicSequenceWatermark;
    if (!Number.isSafeInteger(watermark) || watermark < 0) return { valid: false, sequences: null, watermark: null };
    if (isPublic(record)) {
      const sequence = value.publicSequence;
      if (!Number.isSafeInteger(sequence) || sequence < 1 || sequence !== watermark || seenSequences.has(sequence)) return { valid: false, sequences: null, watermark: null };
      seenSequences.add(sequence);
      if (typeof value.id === "string" && value.id) sequences.set(value.id, sequence);
    } else if (Object.hasOwn(value, "publicSequence")) return { valid: false, sequences: null, watermark: null };
    if (previousWatermark !== null && watermark !== previousWatermark + (isPublic(record) ? 1 : 0)) return { valid: false, sequences: null, watermark: null };
    if (typeof value.id === "string" && value.id) {
      if (ids.has(value.id)) return { valid: false, sequences: null, watermark: null };
      ids.add(value.id);
    }
    previousWatermark = watermark;
  }
  return { valid: true, sequences, watermark: previousWatermark ?? 0 };
}

function oldFields(value, publicSequences) {
  const fields = { ...value };
  delete fields.botTargetPressure;
  delete fields.publicSequenceWatermark;
  delete fields.publicSequence;
  const sequence = typeof value.id === "string" ? publicSequences?.get(value.id) : undefined;
  return { ...fields, ...(sequence === undefined ? {} : { publicSequence: sequence }) };
}

function oldMessageEvent(entry, index) {
  if (!entry.startsWith("@event:")) return { type: "message", id: `legacy-${index}-${entry}`, message: entry };
  try { return { type: "message", ...JSON.parse(entry.slice(7)) }; } catch { return null; }
}

function oldTimeline(entries, viewerPlayerId) {
  const state = oldPublicSequences(entries);
  const events = [];
  for (let index = 0; index < entries.length; index++) {
    const entry = entries[index];
    if (entry.startsWith("@history:")) {
      try { events.push({ type: "message", presentation: false, ...oldFields(JSON.parse(entry.slice(9)), state.sequences), appendOrder: index }); } catch { /* preserve malformed-record skip */ }
      continue;
    }
    if (entry.startsWith("@cards:")) {
      try { events.push({ type: "cards", ...oldFields(JSON.parse(entry.slice(7)), state.sequences), appendOrder: index }); } catch { /* preserve malformed-record skip */ }
      continue;
    }
    if (!entry.startsWith("@card:")) {
      const event = oldMessageEvent(entry, index);
      if (event) events.push({ ...oldFields(event, state.sequences), appendOrder: index });
      continue;
    }
    try {
      const card = JSON.parse(entry.slice(6));
      if (typeof card.privateToPlayerId === "string" && card.privateToPlayerId !== viewerPlayerId) continue;
      events.push({ type: "card", ...oldFields(card, state.sequences), appendOrder: index });
    } catch { /* preserve malformed-record skip */ }
  }
  return events.filter((event) => event.type === "message" ? typeof event.message === "string"
    : event.type === "card" ? Boolean(event.card && typeof event.card === "object" && typeof event.card.id === "string" && typeof event.card.kind === "string")
      : event.type === "cards" && Array.isArray(event.cards) && event.cards.length > 0 && event.cards.every((card) => card && typeof card === "object" && typeof card.id === "string" && typeof card.kind === "string"));
}

function oldMessages(entries) {
  return entries.flatMap((entry, index) => {
    if (entry.startsWith("@card:") || entry.startsWith("@cards:")) return [];
    if (entry.startsWith("@history:")) {
      try { return [JSON.parse(entry.slice(9)).message]; } catch { return []; }
    }
    const event = oldMessageEvent(entry, index);
    return event ? [event.message] : [];
  });
}

function projection(entries, viewerId, decoded = decodePublicLog(entries)) {
  return {
    timeline: roomLogTimeline(entries, viewerId, decoded),
    log: legacyLogMessages(decoded),
    publicSequenceWatermark: decoded.publicSequenceWatermark,
    publicSequences: decoded.publicSequences ? [...decoded.publicSequences.entries()] : null,
  };
}

function makeLongLog() {
  const publicEvents = Array.from({ length: 203 }, (_, index) => `@event:${JSON.stringify({
    id: `public-${index}`,
    message: `Public event ${index}`,
    player: "Public player",
    publicSequence: index + 1,
    publicSequenceWatermark: index + 1,
  })}`);
  const privateCard = (viewerId, id) => `@card:${JSON.stringify({
    id: `event-${id}`,
    action: "gain",
    presentation: false,
    privateToPlayerId: viewerId,
    card: { id, kind: "Dodge", suit: "heart", rank: "J" },
    publicSequenceWatermark: 203,
  })}`;
  const history = Array.from({ length: 150 }, (_, index) => `@history:${JSON.stringify({
    id: `history-${index}`,
    message: `Bot work ${index}`,
    presentation: false,
    publicSequenceWatermark: 203,
  })}`);
  return ["legacy announcement", ...publicEvents, privateCard("host-1", "host-card"), privateCard("other-1", "other-card"), ...history,
    `@cards:${JSON.stringify({ id: "private-cards", cards: [{ id: "hidden-card", kind: "Peach", suit: "heart", rank: "Q" }], presentation: false, privateToPlayerId: "host-1", publicSequenceWatermark: 203 })}`,
    "@event:{malformed"];
}

test("room log decoding reuses one parsed value for sequence, timeline, and legacy projections", () => {
  const log = makeLongLog();
  const structuredCount = log.filter((entry) => prefixes.some((prefix) => entry.startsWith(prefix))).length;
  const originalParse = JSON.parse;
  let parseCount = 0;
  JSON.parse = (...args) => {
    parseCount += 1;
    return originalParse(...args);
  };
  let decoded;
  try {
    decoded = decodePublicLog(log);
    const host = projection(log, "host-1", decoded);
    const other = projection(log, "other-1", decoded);
    const anonymous = projection(log, undefined, decoded);
    assert.equal(decoded.valid, true);
    assert.equal(decoded.publicSequenceWatermark, 203);
    assert.equal(parseCount, structuredCount, "structured records are decoded once; later projections reuse the parsed entries");
    assert.ok(host.timeline.some((event) => event.card?.id === "host-card"));
    assert.ok(!host.timeline.some((event) => event.card?.id === "other-card"));
    assert.ok(other.timeline.some((event) => event.card?.id === "other-card"));
    assert.ok(!anonymous.timeline.some((event) => event.card?.id === "host-card" || event.card?.id === "other-card"));
    assert.equal(host.timeline.filter((event) => event.type === "message").length, 354);
  } finally {
    JSON.parse = originalParse;
  }
  for (const viewerId of ["host-1", "other-1", undefined]) {
    const actual = projection(log, viewerId);
    const state = oldPublicSequences(log);
    const expected = {
      timeline: oldTimeline(log, viewerId),
      log: oldMessages(log),
      publicSequenceWatermark: state.watermark,
      publicSequences: state.sequences ? [...state.sequences.entries()] : null,
    };
    assert.deepEqual(actual, expected, `full decoded log projection is unchanged for ${viewerId ?? "anonymous"}`);
  }
});

test("malformed and invalid public-sequence records fail closed without changing legacy projection semantics", () => {
  const log = [
    `@event:${JSON.stringify({ id: "valid-1", message: "one", publicSequence: 1, publicSequenceWatermark: 1 })}`,
    `@event:${JSON.stringify({ id: "duplicate", message: "two", publicSequence: 1, publicSequenceWatermark: 1 })}`,
    `@history:${JSON.stringify({ id: "private-history", message: "hidden", presentation: false, publicSequenceWatermark: 1 })}`,
    "@event:{bad-json",
    "legacy fallback",
  ];
  const decoded = decodePublicLog(log);
  assert.equal(decoded.valid, false);
  assert.equal(decoded.publicSequences, null);
  for (const viewerId of ["host-1", undefined]) {
    assert.deepEqual(projection(log, viewerId), {
      timeline: oldTimeline(log, viewerId),
      log: oldMessages(log),
      publicSequenceWatermark: null,
      publicSequences: null,
    });
  }
});
