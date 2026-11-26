/**
 * Runtime-only counters for the compact Bot path.  These values are deliberately
 * kept off public outcomes and requests: they are evidence for the executing
 * driver, not game state or a client-visible contract.
 */
export type BotRuntimeCounters = {
  roomStateCalls: number;
  compactProjectionShortCircuits: number;
  fullViewerProjectionCalls: number;
  requestJsonEncodes: number;
  requestJsonParses: number;
  responseJsonParses: number;
  diagnosticD1Reads: number;
};

export function createBotRuntimeCounters(): BotRuntimeCounters {
  return {
    roomStateCalls: 0,
    compactProjectionShortCircuits: 0,
    fullViewerProjectionCalls: 0,
    requestJsonEncodes: 0,
    requestJsonParses: 0,
    responseJsonParses: 0,
    diagnosticD1Reads: 0,
  };
}

export function incrementBotRuntimeCounter(counters: BotRuntimeCounters | undefined, key: keyof BotRuntimeCounters, amount = 1) {
  if (!counters) return;
  counters[key] += amount;
}

export function snapshotBotRuntimeCounters(counters: BotRuntimeCounters | undefined) {
  return counters ? { ...counters } : null;
}
