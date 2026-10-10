const ACTIVE_KEY = "wtk.attack-dodge-ux-trace.active.v1";
const DOCUMENT_KEY = "wtk.attack-dodge-ux-trace.document.v1";
const MAX_TRACE_ENTRIES = 700;

export type AttackDodgeUxTraceEntry = {
  elapsedMs: number;
  stage: string;
  data: Record<string, unknown>;
};

type AttackDodgeUxTraceDocument = {
  schema: "wtk-attack-dodge-ux-trace";
  version: 1;
  startedAt: string;
  traceId?: string;
  environment: {
    userAgent: string;
    viewport: { width: number; height: number; devicePixelRatio: number };
    visualViewport: { width: number; height: number; scale: number } | null;
    reducedMotion: boolean;
  };
  entries: AttackDodgeUxTraceEntry[];
};

let memoryDocument: AttackDodgeUxTraceDocument | null = null;
let memoryActive = false;
let storageUnavailable = false;
const activeListeners = new Set<() => void>();

export function subscribeToAttackDodgeUxTraceActive(listener: () => void) {
  activeListeners.add(listener);
  return () => { activeListeners.delete(listener); };
}

export function getAttackDodgeUxTraceServerSnapshot() {
  return false;
}

function notifyActiveListeners() {
  activeListeners.forEach((listener) => listener());
}

function sessionStorageOrNull(): Storage | null {
  if (typeof window === "undefined" || storageUnavailable) return null;
  try {
    return window.sessionStorage;
  } catch {
    storageUnavailable = true;
    return null;
  }
}

function readDocument(): AttackDodgeUxTraceDocument | null {
  const storage = sessionStorageOrNull();
  if (storage) {
    try {
      const raw = storage.getItem(DOCUMENT_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as AttackDodgeUxTraceDocument;
        if (parsed?.schema === "wtk-attack-dodge-ux-trace" && parsed.version === 1 && Array.isArray(parsed.entries)) {
          memoryDocument = parsed;
          return parsed;
        }
      }
    } catch {
      // A damaged or unavailable browser storage entry must never affect gameplay.
    }
  }
  return memoryDocument;
}

function writeDocument(document: AttackDodgeUxTraceDocument) {
  memoryDocument = document;
  const storage = sessionStorageOrNull();
  if (!storage) return;
  try {
    storage.setItem(DOCUMENT_KEY, JSON.stringify(document));
  } catch {
    // Keep the bounded trace in memory if Safari storage is unavailable/full.
    storageUnavailable = true;
  }
}

export function isAttackDodgeUxTraceActive(): boolean {
  const storage = sessionStorageOrNull();
  if (!storage) return memoryActive;
  try {
    memoryActive = storage.getItem(ACTIVE_KEY) === "true";
  } catch {
    // Fall back to the in-memory toggle.
  }
  return memoryActive;
}

export function getAttackDodgeUxTraceId(): string | null {
  if (!isAttackDodgeUxTraceActive()) return null;
  const document = readDocument();
  if (!document) return null;
  if (!document.traceId) {
    document.traceId = typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
    writeDocument(document);
  }
  return document.traceId;
}

export function recordAttackDodgeUxTrace(stage: string, data: Record<string, unknown>) {
  if (!isAttackDodgeUxTraceActive()) return;
  const document = readDocument();
  if (!document) return;
  const previous = document.entries.at(-1);
  if (previous?.stage === stage && JSON.stringify(previous.data) === JSON.stringify(data)) return;

  document.entries.push({
    elapsedMs: Math.max(0, Date.now() - Date.parse(document.startedAt)),
    stage,
    data,
  });
  if (document.entries.length > MAX_TRACE_ENTRIES) document.entries.splice(0, document.entries.length - MAX_TRACE_ENTRIES);
  writeDocument(document);
}

export function startAttackDodgeUxTrace() {
  if (typeof window === "undefined") return;
  const viewport = window.visualViewport;
  const document: AttackDodgeUxTraceDocument = {
    schema: "wtk-attack-dodge-ux-trace",
    version: 1,
    startedAt: new Date().toISOString(),
    traceId: typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`,
    environment: {
      userAgent: navigator.userAgent,
      viewport: {
        width: Math.round(window.innerWidth),
        height: Math.round(window.innerHeight),
        devicePixelRatio: window.devicePixelRatio || 1,
      },
      visualViewport: viewport ? {
        width: Math.round(viewport.width),
        height: Math.round(viewport.height),
        scale: Math.round(viewport.scale * 100) / 100,
      } : null,
      reducedMotion: window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    },
    entries: [],
  };
  memoryDocument = document;
  memoryActive = true;
  const storage = sessionStorageOrNull();
  if (storage) {
    try {
      storage.setItem(DOCUMENT_KEY, JSON.stringify(document));
      storage.setItem(ACTIVE_KEY, "true");
    } catch {
      // The recorder remains usable in memory if browser storage is restricted.
      storageUnavailable = true;
    }
  }
  recordAttackDodgeUxTrace("trace-started", { traceId: document.traceId, note: "Local Attack/Dodge graph diagnostics enabled." });
  notifyActiveListeners();
}

export function stopAttackDodgeUxTrace() {
  recordAttackDodgeUxTrace("trace-stopped", { note: "Local Attack/Dodge graph diagnostics stopped." });
  memoryActive = false;
  const storage = sessionStorageOrNull();
  if (storage) {
    try {
      storage.setItem(ACTIVE_KEY, "false");
    } catch {
      // The in-memory toggle is sufficient for this page lifetime.
      storageUnavailable = true;
    }
  }
  notifyActiveListeners();
}

export function exportAttackDodgeUxTrace(): string {
  const document = readDocument();
  return JSON.stringify(document ?? {
    schema: "wtk-attack-dodge-ux-trace",
    version: 1,
    entries: [],
    note: "No trace has been recorded in this browser tab.",
  }, null, 2);
}
