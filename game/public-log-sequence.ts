export type SequencedLogRecordPrefix = "@event:" | "@card:" | "@cards:" | "@history:";

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

function structuredRecords(log: readonly string[]): ParsedRecord[] {
  const records: ParsedRecord[] = [];
  for (let index = 0; index < log.length; index++) {
    const entry = log[index];
    const prefix = prefixes.find((candidate) => entry.startsWith(candidate));
    if (!prefix) continue;
    try {
      const value: unknown = JSON.parse(entry.slice(prefix.length));
      if (value && typeof value === "object" && !Array.isArray(value)) {
        records.push({ index, prefix, value: value as Record<string, unknown> });
      }
    } catch {
      // Unparseable historical records do not supply semantic facts or ordinals.
    }
  }
  return records;
}

function isPublicPresentational(record: Pick<ParsedRecord, "prefix" | "value">) {
  return record.prefix !== "@history:"
    && record.value.presentation !== false
    && typeof record.value.privateToPlayerId !== "string";
}

function inspectSequenceState(log: readonly string[]): SequenceState {
  const records = structuredRecords(log);
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

function bootstrapLegacyLog(log: readonly string[]) {
  let watermark = 0;
  const recordsByIndex = new Map(structuredRecords(log).map((record) => [record.index, record]));
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
  const state = inspectSequenceState(log);
  return state.hasMetadata && state.valid ? state.publicSequences : null;
}

/** Adds one structured log record, bootstrapping retained legacy records when needed. */
export function appendSequencedLogRecord(
  log: readonly string[],
  prefix: SequencedLogRecordPrefix,
  value: Record<string, unknown>,
): string[] {
  const state = inspectSequenceState(log);
  if (state.hasMetadata && !state.valid) throw new Error("ROOM_LOG_PUBLIC_SEQUENCE_INVALID");

  const base = state.hasMetadata ? [...log] : bootstrapLegacyLog(log).log;
  const baseState = state.hasMetadata ? state : inspectSequenceState(base);
  if (!baseState.valid) throw new Error("ROOM_LOG_PUBLIC_SEQUENCE_INVALID");
  const watermark = baseState.hasMetadata ? baseState.watermark : 0;
  const isPublic = isPublicPresentational({ prefix, value });
  const nextWatermark = watermark + (isPublic ? 1 : 0);
  if (!Number.isSafeInteger(nextWatermark)) throw new Error("ROOM_LOG_PUBLIC_SEQUENCE_EXHAUSTED");
  const record = { ...value, [watermarkKey]: nextWatermark };
  if (isPublic) record[sequenceKey] = nextWatermark;
  else delete record[sequenceKey];

  return [...base.slice(-199), `${prefix}${JSON.stringify(record)}`];
}
