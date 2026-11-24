export type SequencedLogRecordPrefix = "@event:" | "@card:" | "@cards:" | "@history:";

/**
 * A decoded room-log entry.  `parsed` intentionally retains the JSON value
 * (including non-object values) so callers can preserve the existing
 * malformed/legacy handling without parsing the same entry again.
 */
export type DecodedLogEntry = {
  index: number;
  entry: string;
  prefix: SequencedLogRecordPrefix | null;
  parsed: unknown;
  value: Record<string, unknown> | null;
};

export type DecodedPublicLog = {
  entries: readonly DecodedLogEntry[];
  hasMetadata: boolean;
  valid: boolean;
  publicSequences: ReadonlyMap<string, number> | null;
  publicSequenceWatermark: number | null;
};

type ParsedRecord = {
  index: number;
  prefix: SequencedLogRecordPrefix;
  value: Record<string, unknown>;
};

type SequenceState = {
  hasMetadata: boolean;
  valid: boolean;
  watermark: number;
  publicSequences: Map<string, number>;
};

const prefixes: readonly SequencedLogRecordPrefix[] = ["@event:", "@card:", "@cards:", "@history:"];
const watermarkKey = "publicSequenceWatermark";
const sequenceKey = "publicSequence";

function owns(value: Record<string, unknown>, key: string) {
  return Object.prototype.hasOwnProperty.call(value, key);
}

export function decodeLogEntries(log: readonly string[]): DecodedLogEntry[] {
  return log.map((entry, index) => {
    const prefix = prefixes.find((candidate) => entry.startsWith(candidate)) ?? null;
    if (!prefix) return { index, entry, prefix, parsed: undefined, value: null };
    try {
      const parsed: unknown = JSON.parse(entry.slice(prefix.length));
      const value = parsed && typeof parsed === "object" && !Array.isArray(parsed)
        ? parsed as Record<string, unknown>
        : null;
      return { index, entry, prefix, parsed, value };
    } catch {
      // Unparseable historical records do not supply semantic facts or ordinals.
      return { index, entry, prefix, parsed: undefined, value: null };
    }
  });
}

function structuredRecords(decoded: readonly DecodedLogEntry[]): ParsedRecord[] {
  return decoded.flatMap((entry) => entry.prefix && entry.value
    ? [{ index: entry.index, prefix: entry.prefix, value: entry.value }]
    : []);
}

function isPublicPresentational(record: Pick<ParsedRecord, "prefix" | "value">) {
  return record.prefix !== "@history:"
    && record.value.presentation !== false
    && typeof record.value.privateToPlayerId !== "string";
}

function inspectSequenceState(records: readonly ParsedRecord[]): SequenceState {
  const hasMetadata = records.some(({ value }) => owns(value, watermarkKey) || owns(value, sequenceKey));
  if (!hasMetadata) return { hasMetadata: false, valid: true, watermark: 0, publicSequences: new Map() };

  const publicSequences = new Map<string, number>();
  const seenIds = new Set<string>();
  const seenSequences = new Set<number>();
  let previousWatermark: number | null = null;
  for (const current of records) {
    const { value } = current;
    const watermark = value[watermarkKey];
    const publicEvent = isPublicPresentational(current);
    if (!Number.isSafeInteger(watermark) || (watermark as number) < 0) {
      return { hasMetadata, valid: false, watermark: 0, publicSequences: new Map() };
    }
    if (publicEvent) {
      const sequence = value[sequenceKey];
      if (!Number.isSafeInteger(sequence) || (sequence as number) < 1 || sequence !== watermark
        || seenSequences.has(sequence as number)) {
        return { hasMetadata, valid: false, watermark: 0, publicSequences: new Map() };
      }
      seenSequences.add(sequence as number);
      if (typeof value.id === "string" && value.id) publicSequences.set(value.id, sequence as number);
    } else if (owns(value, sequenceKey)) {
      return { hasMetadata, valid: false, watermark: 0, publicSequences: new Map() };
    }

    if (previousWatermark !== null) {
      const expected = previousWatermark + (publicEvent ? 1 : 0);
      if (!Number.isSafeInteger(expected) || watermark !== expected) {
        return { hasMetadata, valid: false, watermark: 0, publicSequences: new Map() };
      }
    }
    if (typeof value.id === "string" && value.id) {
      if (seenIds.has(value.id)) return { hasMetadata, valid: false, watermark: 0, publicSequences: new Map() };
      seenIds.add(value.id);
    }
    previousWatermark = watermark as number;
  }
  return { hasMetadata, valid: true, watermark: previousWatermark ?? 0, publicSequences };
}

export function decodePublicLog(log: readonly string[]): DecodedPublicLog {
  const entries = decodeLogEntries(log);
  const records = structuredRecords(entries);
  const state = inspectSequenceState(records);
  const publicSequenceWatermark = !state.valid
    ? null
    : state.hasMetadata
      ? state.watermark
      : records.reduce((watermark, record) => watermark + (isPublicPresentational(record) ? 1 : 0), 0);
  return {
    entries,
    hasMetadata: state.hasMetadata,
    valid: state.valid,
    publicSequences: state.hasMetadata && state.valid ? state.publicSequences : null,
    publicSequenceWatermark,
  };
}

function bootstrapLegacyLog(log: readonly string[], decoded: readonly DecodedLogEntry[]) {
  let watermark = 0;
  const recordsByIndex = new Map(structuredRecords(decoded).map((record) => [record.index, record]));
  const bootstrapped = log.map((entry, index) => {
    const parsed = recordsByIndex.get(index);
    if (!parsed) return entry;
    const isPublic = isPublicPresentational(parsed);
    if (isPublic) watermark += 1;
    const value = { ...parsed.value, [watermarkKey]: watermark };
    if (isPublic) value[sequenceKey] = watermark;
    else delete value[sequenceKey];
    return `${parsed.prefix}${JSON.stringify(value)}`;
  });
  return { log: bootstrapped, watermark };
}

/** Returns validated ordinals for public, presentational structured records; legacy or invalid logs fail closed. */
export function publicEventSequencesFromLog(log: readonly string[]): ReadonlyMap<string, number> | null {
  return decodePublicLog(log).publicSequences;
}

/** Returns the validated public sequence watermark, or null when persisted metadata is malformed. */
export function publicSequenceWatermarkFromLog(log: readonly string[]): number | null {
  // appendSequencedLogRecord bootstraps legacy structured history in append
  // order. Return that same derived watermark here so a turn boundary written
  // immediately before the first sequenced append does not accidentally
  // classify pre-boundary legacy events as new-turn events.
  return decodePublicLog(log).publicSequenceWatermark;
}

/** Adds one structured log record, bootstrapping retained legacy records when needed. */
export function appendSequencedLogRecord(
  log: readonly string[],
  prefix: SequencedLogRecordPrefix,
  value: Record<string, unknown>,
): string[] {
  const decoded = decodePublicLog(log);
  if (decoded.hasMetadata && !decoded.valid) throw new Error("ROOM_LOG_PUBLIC_SEQUENCE_INVALID");

  const base = decoded.hasMetadata ? [...log] : bootstrapLegacyLog(log, decoded.entries).log;
  const baseDecoded = decoded.hasMetadata ? decoded : decodePublicLog(base);
  if (!baseDecoded.valid) throw new Error("ROOM_LOG_PUBLIC_SEQUENCE_INVALID");
  const watermark = baseDecoded.hasMetadata ? baseDecoded.publicSequenceWatermark ?? 0 : 0;
  const isPublic = isPublicPresentational({ prefix, value });
  const nextWatermark = watermark + (isPublic ? 1 : 0);
  if (!Number.isSafeInteger(nextWatermark)) throw new Error("ROOM_LOG_PUBLIC_SEQUENCE_EXHAUSTED");
  const record = { ...value, [watermarkKey]: nextWatermark };
  if (isPublic) record[sequenceKey] = nextWatermark;
  else delete record[sequenceKey];

  return [...base.slice(-199), `${prefix}${JSON.stringify(record)}`];
}
