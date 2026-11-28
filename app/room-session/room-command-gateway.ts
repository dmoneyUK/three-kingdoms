import { resyncStaleResponseTimer } from "../../game/game-screen-recovery";
import { classifyRoomGetFailure, RoomGetError, RoomPollRecovery } from "../../game/room-poll-recovery";
import { normalizeRoomData } from "../../game/room-safety.js";

export type RoomSessionView = Readonly<{
  roomCode: string;
  viewerId: string | null;
  epoch: number;
  active: boolean;
}>;

export type RoomSessionRoom = {
  code: string;
  meId: string;
  status: string;
  isTestController?: boolean;
  players?: readonly { id: string; isHost?: boolean; isTestPlayer?: boolean }[];
};

export type RoomCommandGatewayCallbacks<TRoom extends RoomSessionRoom> = {
  onSessionChange?: (view: RoomSessionView, previous: RoomSessionView) => void;
  onRoom?: (room: TRoom, source: "poll" | "action") => boolean;
  onConnection?: (interrupted: boolean) => void;
  onBusy?: (busy: boolean, action: string | null) => void;
  onError?: (message: string) => void;
  onRetired?: (category: "missing-room" | "invalid-session" | "left") => void;
  onSavedName?: (name: string) => void;
  trace?: (event: string, data: Record<string, unknown>) => void;
  traceId?: () => string | null;
  onServerDiagnostic?: (diagnostic: Record<string, unknown>, room: TRoom | null, token: string, source: "poll" | "action") => void;
};

export type RoomCommandGatewayOptions<TRoom extends RoomSessionRoom> = {
  fetcher?: typeof fetch;
  normalize?: (value: unknown) => TRoom | null;
  callbacks?: RoomCommandGatewayCallbacks<TRoom>;
  storage?: () => Pick<Storage, "getItem" | "setItem" | "removeItem"> | null;
  now?: () => number;
  setTimer?: typeof setTimeout;
  clearTimer?: typeof clearTimeout;
  timeoutMs?: number;
};

export type RoomCommandInput<TRoom extends RoomSessionRoom> = {
  action: string;
  name: string;
  code: string;
  extra?: Record<string, unknown>;
  context?: Record<string, unknown>;
  room?: TRoom | null;
};

type SavedRoomSession = { code: string; token: string; name?: string };
type Session = { code: string; token: string; viewerId: string | null; epoch: number };
type Capture = Session & { generation: number; dispatchedAt: number };
type ReadFlight<TRoom extends RoomSessionRoom> = { controller: AbortController; promise: Promise<TRoom | false>; fresh: boolean };
type WriteFlight = { id: number; roomCode: string; identityKey: string; generation: number; dispatchedAt: number; conflicted: boolean };

const SESSION_STORAGE_KEY = "three-realms-session";
const SESSION_CODE = /^[A-Z0-9]{5}$/;

function emptyView(epoch: number): RoomSessionView {
  return Object.freeze({ roomCode: "", viewerId: null, epoch, active: false });
}

function responseErrorMessage(payload: unknown): string | null {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return null;
  const error = (payload as { error?: unknown }).error;
  return typeof error === "string" && error.trim() ? error : null;
}

async function readJson<T>(response: Response): Promise<T> {
  const text = await response.text();
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error(response.status >= 500
      ? "The local game server had a temporary error. Please try again."
      : "The game server returned an invalid response. Please try again.");
  }
}

/**
 * One credential owner and one freshness/arbitration point for a mounted Home.
 * It owns transport and private session metadata, while Home remains the sole
 * rendered Room snapshot owner.
 */
export class RoomCommandGateway<TRoom extends RoomSessionRoom> {
  private readonly fetcher: typeof fetch;
  private readonly normalize: (value: unknown) => TRoom | null;
  private callbacks: RoomCommandGatewayCallbacks<TRoom>;
  private readonly storage: NonNullable<RoomCommandGatewayOptions<TRoom>["storage"]>;
  private readonly now: () => number;
  private readonly setTimer: typeof setTimeout;
  private readonly clearTimer: typeof clearTimeout;
  private readonly timeoutMs: number;
  private readonly pollRecovery = new RoomPollRecovery();
  private readonly reads = new Map<string, ReadFlight<TRoom>>();
  private readonly postDrainReads = new Map<string, Promise<TRoom | false>>();
  private readonly forcedReads = new Map<string, Promise<TRoom | false>>();
  private readonly writesByRoom = new Map<string, Map<number, WriteFlight>>();
  private readonly humanSubmissions = new Set<string>();
  private session: Session | null = null;
  private epoch = 0;
  private generation = 0;
  private writeSequence = 0;
  private busyOwner: { identityKey: string; id: number } | null = null;
  private needsFreshSync = false;
  private testController = false;

  constructor(options: RoomCommandGatewayOptions<TRoom> = {}) {
    this.fetcher = options.fetcher ?? ((input, init) => globalThis.fetch(input, init));
    this.normalize = options.normalize ?? ((value) => normalizeRoomData(value) as TRoom | null);
    this.callbacks = options.callbacks ?? {};
    this.storage = options.storage ?? (() => typeof window === "undefined" ? null : window.localStorage);
    this.now = options.now ?? Date.now;
    this.setTimer = options.setTimer ?? ((handler, timeout, ...args) => globalThis.setTimeout(handler, timeout, ...args));
    this.clearTimer = options.clearTimer ?? ((timer) => globalThis.clearTimeout(timer));
    this.timeoutMs = options.timeoutMs ?? 15_000;
  }

  setCallbacks(callbacks: RoomCommandGatewayCallbacks<TRoom>): void {
    this.callbacks = callbacks;
  }

  get view(): RoomSessionView {
    const session = this.session;
    return session
      ? Object.freeze({ roomCode: session.code, viewerId: session.viewerId, epoch: session.epoch, active: Boolean(session.token) })
      : emptyView(this.epoch);
  }

  get stale(): boolean {
    return this.pollRecovery.stale || this.needsFreshSync;
  }

  retryDelay(hidden: boolean): number {
    return this.pollRecovery.retryDelay(hidden);
  }

  canSendRoomCommand(): boolean {
    const session = this.session;
    return Boolean(session?.token) && (!this.stale || Boolean(this.writesByRoom.get(session!.code)?.size));
  }

  private get storageApi() {
    try { return this.storage(); } catch { return null; }
  }

  private readSavedSession(): SavedRoomSession | null {
    let saved: string | null = null;
    try { saved = this.storageApi?.getItem(SESSION_STORAGE_KEY) ?? null; } catch { return null; }
    if (!saved) return null;
    try {
      const value = JSON.parse(saved) as Partial<SavedRoomSession>;
      if (!value || typeof value !== "object" || !SESSION_CODE.test(value.code ?? "") || typeof value.token !== "string" || !value.token) {
        throw new Error("invalid saved session");
      }
      return { code: value.code!, token: value.token, ...(typeof value.name === "string" ? { name: value.name } : {}) };
    } catch {
      this.clearSavedSession();
      return null;
    }
  }

  private saveSession(name: string): void {
    const session = this.session;
    if (!session?.token || !SESSION_CODE.test(session.code)) return;
    try { this.storageApi?.setItem(SESSION_STORAGE_KEY, JSON.stringify({ code: session.code, token: session.token, name })); } catch { /* Storage is optional; the in-memory session remains usable. */ }
  }

  private clearSavedSession(): void {
    try { this.storageApi?.removeItem(SESSION_STORAGE_KEY); } catch { /* A blocked storage API must not prevent session retirement. */ }
  }

  private identityKey(session: Pick<Session, "code" | "viewerId" | "epoch">): string {
    return JSON.stringify([session.code, session.viewerId ?? "", session.epoch]);
  }

  private requestKey(capture: Capture): string {
    return JSON.stringify([capture.code, capture.viewerId ?? "", capture.epoch, capture.generation]);
  }

  private capture(): Capture | null {
    return this.session ? { ...this.session, generation: this.generation, dispatchedAt: this.now() } : null;
  }

  private isCurrent(capture: Capture): boolean {
    return this.matchesSession(capture) && this.generation === capture.generation;
  }

  private matchesSession(capture: Capture): boolean {
    const current = this.session;
    return Boolean(current && current.epoch === capture.epoch && current.code === capture.code
      && current.viewerId === capture.viewerId && current.token === capture.token);
  }

  private abortReads(): void {
    for (const flight of this.reads.values()) flight.controller.abort();
    this.reads.clear();
  }

  private activateSession(code: string, token: string, viewerId: string | null): Session {
    const previousSession = this.session;
    if (previousSession && previousSession.code === code && previousSession.token === token && previousSession.viewerId === viewerId) return previousSession;
    const previous = this.view;
    this.abortReads();
    this.epoch += 1;
    this.generation = 0;
    this.session = { code, token, viewerId, epoch: this.epoch };
    this.needsFreshSync = Boolean(token);
    this.pollRecovery.reset();
    if (previousSession?.code !== code) this.testController = false;
    this.busyOwner = null;
    this.callbacks.onSessionChange?.(this.view, previous);
    this.callbacks.onBusy?.(false, null);
    return this.session;
  }

  private bindViewer(capture: Capture, viewerId: string, token = capture.token): Capture | null {
    if (!this.isCurrent(capture)) return null;
    this.activateSession(capture.code, token, viewerId);
    return this.capture();
  }

  async restoreSavedSession(): Promise<TRoom | false> {
    const saved = this.readSavedSession();
    if (!saved) return false;
    this.callbacks.onSavedName?.(saved.name ?? "");
    this.callbacks.trace?.("saved-game-session-restored", { automaticRecording: true });
    this.activateSession(saved.code, saved.token, null);
    return this.refresh({ forceFresh: true, reason: "restore" });
  }

  async refresh(options: { viewerId?: string | null; forceFresh?: boolean; reason?: string } = {}): Promise<TRoom | false> {
    let session = this.session;
    if (!session?.token) return false;
    if (Object.prototype.hasOwnProperty.call(options, "viewerId") && options.viewerId !== session.viewerId) {
      session = this.activateSession(session.code, session.token, options.viewerId ?? null);
    }

    const identity = this.identityKey(session);
    const queuedRead = this.postDrainReads.get(identity);
    if (queuedRead) return queuedRead;

    if (options.forceFresh) {
      const currentCapture = this.capture();
      if (!currentCapture) return false;
      const currentRequestKey = this.requestKey(currentCapture);
      const existingForcedRead = this.forcedReads.get(currentRequestKey);
      if (existingForcedRead) return existingForcedRead;
      this.generation += 1;
      this.needsFreshSync = true;
      this.abortReads();
      const capture = this.capture();
      if (!capture) return false;
      const requestKey = this.requestKey(capture);
      this.pollRecovery.activate(requestKey);
      const activeWrites = this.writesByRoom.get(capture.code);
      let pending: Promise<TRoom | false>;
      if (activeWrites?.size) {
        this.needsFreshSync = true;
        pending = this.waitForWritesThenRead(capture, identity, options.reason ?? "fresh-read");
        this.postDrainReads.set(identity, pending);
      } else {
        pending = this.dispatchRead(capture, options.reason ?? "fresh-read", true);
      }
      this.forcedReads.set(requestKey, pending);
      try { return await pending; }
      finally { if (this.forcedReads.get(requestKey) === pending) this.forcedReads.delete(requestKey); }
    }
    const capture = this.capture();
    if (!capture) return false;
    const requestKey = this.requestKey(capture);
    this.pollRecovery.activate(requestKey);

    const activeWrites = this.writesByRoom.get(capture.code);
    if (activeWrites?.size) {
      this.needsFreshSync = true;
      const pending = this.waitForWritesThenRead(capture, identity, options.reason ?? "poll");
      this.postDrainReads.set(identity, pending);
      return pending;
    }
    return this.dispatchRead(capture, options.reason ?? "poll", false);
  }

  private async waitForWritesThenRead(capture: Capture, identity: string, reason: string): Promise<TRoom | false> {
    try {
      while (this.writesByRoom.get(capture.code)?.size) {
        const writes = [...this.writesByRoom.get(capture.code)!.keys()];
        await Promise.all(writes.map((id) => this.waitForWrite(capture.code, id)));
      }
      if (!this.session || this.identityKey(this.session) !== identity || !this.session.token) return false;
      const current = this.capture();
      if (!current) return false;
      return await this.dispatchRead(current, reason, true);
    } finally {
      this.postDrainReads.delete(identity);
    }
  }

  private readonly writeWaiters = new Map<string, Array<() => void>>();

  private waitForWrite(roomCode: string, id: number): Promise<void> {
    if (!this.writesByRoom.get(roomCode)?.has(id)) return Promise.resolve();
    const key = `${roomCode}:${id}`;
    return new Promise((resolve) => {
      const waiters = this.writeWaiters.get(key) ?? [];
      waiters.push(resolve);
      this.writeWaiters.set(key, waiters);
    });
  }

  private async dispatchRead(capture: Capture, reason: string, fresh: boolean): Promise<TRoom | false> {
    if (!this.isCurrent(capture) || !capture.token) return false;
    const key = this.requestKey(capture);
    const existing = this.reads.get(key);
    if (existing) return existing.promise;
    if (!this.pollRecovery.begin(key)) return false;

    const controller = new AbortController();
    let resolveFlight!: (value: TRoom | false) => void;
    let rejectFlight!: (reason?: unknown) => void;
    const promise = new Promise<TRoom | false>((resolve, reject) => {
      resolveFlight = resolve;
      rejectFlight = reject;
    });
    this.reads.set(key, { controller, promise, fresh });
    void this.performRead(capture, key, reason, controller).then(resolveFlight, rejectFlight);
    return promise;
  }

  private async performRead(capture: Capture, key: string, reason: string, controller: AbortController): Promise<TRoom | false> {
    let timeout: ReturnType<typeof setTimeout> | null = null;
    const traceId = this.callbacks.traceId?.() ?? null;
    try {
      if (traceId && this.isCurrent(capture)) this.callbacks.trace?.("room-poll-request", { traceId, reason });
      const query = new URLSearchParams({ code: capture.code, token: capture.token });
      if (capture.viewerId) query.set("testViewerId", capture.viewerId);
      if (traceId) query.set("uxTraceId", traceId);
      timeout = this.setTimer(() => controller.abort(new DOMException("Room request timed out", "TimeoutError")), this.timeoutMs);
      const response = await this.fetcher(`/api/rooms?${query.toString()}`, { cache: "no-store", signal: controller.signal });
      if (traceId && this.isCurrent(capture)) this.callbacks.trace?.("room-poll-response", { traceId, status: response.status, ok: response.ok });
      let raw: unknown;
      try { raw = await response.json(); } catch { throw new RoomGetError("temporary", response.status); }
      if (!response.ok) throw new RoomGetError(classifyRoomGetFailure(response.status, raw), response.status);
      if (!this.isCurrent(capture)) return false;

      let roomPayload = raw;
      let diagnostic: Record<string, unknown> | null = null;
      if (traceId && raw && typeof raw === "object" && !Array.isArray(raw)) {
        const value = raw as { room?: unknown; attackDodgeUxTrace?: Record<string, unknown> };
        if (value.attackDodgeUxTrace) {
          diagnostic = value.attackDodgeUxTrace;
          roomPayload = value.room ?? raw;
        }
      }
      const room = this.normalize(roomPayload);
      if (!room?.meId) throw new RoomGetError("temporary", response.status);
      if (capture.viewerId && room.meId !== capture.viewerId) throw new RoomGetError("unavailable-viewer", response.status);
      if (!this.isCurrent(capture)) return false;

      const wasStale = this.pollRecovery.stale;
      this.testController = Boolean(room.isTestController);
      if (!capture.viewerId && room.isTestController && room.status !== "heroes") {
        const hostId = room.players?.find((player) => player.isHost)?.id;
        if (hostId && hostId !== room.meId) {
          const switched = this.bindViewer(capture, hostId);
          if (!switched) return false;
          return await this.refresh({ forceFresh: true, reason: "test-controller-host" });
        }
      }

      let acceptedCapture = capture;
      if (!capture.viewerId) {
        const bound = this.bindViewer(capture, room.meId);
        if (!bound) return false;
        acceptedCapture = bound;
      }
      if (!this.isCurrent(acceptedCapture)) return false;
      if (diagnostic && traceId) this.callbacks.onServerDiagnostic?.(diagnostic, room, capture.token, "poll");
      if (!this.callbacks.onRoom?.(room, "poll")) {
        this.needsFreshSync = true;
        return false;
      }
      this.needsFreshSync = false;
      const currentKey = this.requestKey(acceptedCapture);
      this.pollRecovery.activate(currentKey);
      this.pollRecovery.recover(currentKey);
      if (wasStale) this.callbacks.trace?.("room-connection-recovered", { status: response.status });
      this.callbacks.onConnection?.(false);
      return room;
    } catch (cause) {
      if (!this.isCurrent(capture)) return false;
      const category = cause instanceof RoomGetError ? cause.category : "temporary";
      this.callbacks.trace?.("room-poll-failure", { category, status: cause instanceof RoomGetError ? cause.status : null });
      if (category === "missing-room" || category === "invalid-session") {
        this.callbacks.trace?.("game-session-retired", { category, status: cause instanceof RoomGetError ? cause.status : null });
        this.retire(category, true);
        return false;
      }
      if (category === "unavailable-viewer" && this.testController && capture.viewerId) {
        this.callbacks.trace?.("test-viewer-unavailable", { selected: true });
        this.activateSession(capture.code, capture.token, null);
        return await this.refresh({ forceFresh: true, reason: "test-viewer-safe-fallback" });
      }
      this.pollRecovery.fail(key);
      this.needsFreshSync = true;
      this.callbacks.onConnection?.(true);
      return false;
    } finally {
      if (timeout !== null) this.clearTimer(timeout);
      this.pollRecovery.end(key);
      this.reads.delete(key);
    }
  }

  private activeWrites(roomCode: string): Map<number, WriteFlight> {
    let writes = this.writesByRoom.get(roomCode);
    if (!writes) {
      writes = new Map();
      this.writesByRoom.set(roomCode, writes);
    }
    return writes;
  }

  private finishWrite(write: WriteFlight): void {
    const writes = this.writesByRoom.get(write.roomCode);
    writes?.delete(write.id);
    const waitersKey = `${write.roomCode}:${write.id}`;
    for (const resolve of this.writeWaiters.get(waitersKey) ?? []) resolve();
    this.writeWaiters.delete(waitersKey);
    if (writes?.size === 0) this.writesByRoom.delete(write.roomCode);
  }

  private beginWrite(capture: Capture): WriteFlight {
    const writes = this.activeWrites(capture.code);
    const conflicted = writes.size > 0;
    if (conflicted) for (const existing of writes.values()) existing.conflicted = true;
    const write = { id: ++this.writeSequence, roomCode: capture.code, identityKey: this.identityKey(capture), generation: capture.generation, dispatchedAt: capture.dispatchedAt, conflicted };
    writes.set(write.id, write);
    return write;
  }

  private async timeoutJson<T>(input: RequestInfo | URL, init: RequestInit = {}): Promise<{ response: Response; data: T }> {
    const controller = new AbortController();
    const priorSignal = init.signal;
    const timeout = this.setTimer(() => controller.abort(new DOMException("Room request timed out", "TimeoutError")), this.timeoutMs);
    const abortFromPrior = () => controller.abort(priorSignal?.reason);
    if (priorSignal?.aborted) abortFromPrior();
    else priorSignal?.addEventListener("abort", abortFromPrior, { once: true });
    try {
      const response = await this.fetcher(input, { ...init, signal: controller.signal });
      const data = await readJson<T>(response);
      return { response, data };
    }
    finally {
      this.clearTimer(timeout);
      priorSignal?.removeEventListener("abort", abortFromPrior);
    }
  }

  private async timeoutFetch(input: RequestInfo | URL, init: RequestInit = {}): Promise<Response> {
    const controller = new AbortController();
    const priorSignal = init.signal;
    const timeout = this.setTimer(() => controller.abort(new DOMException("Room request timed out", "TimeoutError")), this.timeoutMs);
    const abortFromPrior = () => controller.abort(priorSignal?.reason);
    if (priorSignal?.aborted) abortFromPrior();
    else priorSignal?.addEventListener("abort", abortFromPrior, { once: true });
    try { return await this.fetcher(input, { ...init, signal: controller.signal }); }
    finally {
      this.clearTimer(timeout);
      priorSignal?.removeEventListener("abort", abortFromPrior);
    }
  }

  private async prepareJoin(code: string): Promise<"resumed" | "continue" | "stop"> {
    const saved = this.readSavedSession();
    if (!saved || saved.code !== code) return "continue";
    this.callbacks.onSavedName?.(saved.name ?? "");
    this.callbacks.trace?.("saved-game-session-restored", { automaticRecording: true });
    this.activateSession(saved.code, saved.token, null);
    const room = await this.refresh({ forceFresh: true, reason: "join-saved-session" });
    if (room) return "resumed";
    // An explicitly invalid saved session was retired and cleared. A temporary
    // outage keeps its credential private and blocks a second join mutation.
    return this.session?.code === code && this.session.token ? "stop" : "continue";
  }

  async command(input: RoomCommandInput<TRoom>): Promise<boolean> {
    const { action } = input;
    const bootstrap = action === "create" || action === "join";
    const background = action === "preview_harvest" || action === "heartbeat";
    const maintenance = action === "advance_timers";

    if (action === "join") {
      const resume = await this.prepareJoin(input.code);
      if (resume === "resumed") return true;
      if (resume === "stop") return false;
    }
    if (bootstrap) this.activateSession(action === "create" ? "" : input.code, "", null);

    let capture = this.capture();
    if (!capture || (!bootstrap && !capture.token)) return false;
    if (!bootstrap && this.stale && !this.writesByRoom.get(capture.code)?.size && action !== "heartbeat") return false;

    const identity = this.identityKey(capture);
    if (!background && !maintenance && this.humanSubmissions.has(identity)) return false;
    const submissionId = ++this.writeSequence;
    if (!background && !maintenance) {
      this.humanSubmissions.add(identity);
      this.busyOwner = { identityKey: identity, id: submissionId };
      this.callbacks.onBusy?.(true, action);
      this.callbacks.onError?.("");
    }

    const roomReturning = action !== "heartbeat";
    let write: WriteFlight | null = null;
    if (roomReturning && capture.code) {
      this.generation += 1;
      this.needsFreshSync = true;
      this.abortReads();
      capture = this.capture() ?? capture;
      write = this.beginWrite(capture);
    }

    capture = { ...capture, dispatchedAt: this.now() };
    const traceId = this.callbacks.traceId?.() ?? null;
    if (traceId && this.isCurrent(capture)) this.callbacks.trace?.("gameplay-action-request", { traceId, action, hasRevisionContext: Boolean(input.context?.actionRevision) });
    let succeeded = false;
    let shouldRefresh = false;
    let commandError = "";
    let refreshedStaleTimer = false;

    try {
      const body = {
        action,
        name: input.name,
        code: capture.code || input.code,
        token: capture.token,
        ...(input.context ? { context: input.context } : {}),
        ...(traceId ? { uxTraceId: traceId } : {}),
        ...(input.extra ?? {}),
      };
      const { response, data: raw } = await this.timeoutJson<{ error?: string; token?: string; room?: unknown; stale?: boolean; attackDodgeUxTrace?: Record<string, unknown> }>("/api/rooms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (traceId && this.isCurrent(capture)) {
        this.callbacks.trace?.("gameplay-action-response", {
          traceId, action, status: response.status, ok: response.ok,
          stale: raw.stale === true, roomReturned: Boolean(raw.room),
          serverDiagnosticReturned: Boolean(raw.attackDodgeUxTrace),
        });
        if (raw.attackDodgeUxTrace) this.callbacks.onServerDiagnostic?.(raw.attackDodgeUxTrace, input.room ?? null, capture.token, "action");
      }

      if (await resyncStaleResponseTimer(action, response.status, raw.stale === true, async () => {
        if (this.matchesSession(capture)) shouldRefresh = true;
      })) {
        if (!this.matchesSession(capture)) return false;
        refreshedStaleTimer = true;
        succeeded = true;
      } else if (!response.ok || action !== "heartbeat" && !raw.room) {
        throw new Error(responseErrorMessage(raw) ?? "Something went wrong.");
      } else if (action === "heartbeat") {
        succeeded = true;
      } else {
        const room = this.normalize(raw.room);
        if (!room?.meId) throw new Error("The game server returned an invalid response. Please try again.");
        const writeGenerationMatches = !write || (write.generation === capture.generation && capture.dispatchedAt >= write.dispatchedAt);
        if (!this.isCurrent(capture) || !writeGenerationMatches) {
          if (!write || !this.matchesSession(capture)) return false;
          this.needsFreshSync = true;
          shouldRefresh = true;
          succeeded = true;
        }

        if (!this.isCurrent(capture) || !writeGenerationMatches) {
          // A same-session generation barrier makes this response incomparable.
          // Keep its transport result, quarantine the Room, and read after drain.
        } else {

        const currentRoom = input.room ?? null;
        let targetViewer = capture.viewerId;
        let publishRoom = true;
        const isTestController = Boolean(currentRoom?.isTestController);
        if (isTestController && currentRoom?.status === "heroes" && room.status === "heroes") {
          targetViewer = room.meId;
        } else if (isTestController && currentRoom?.status === "heroes" && ["started", "playing", "finished"].includes(room.status)) {
          targetViewer = room.players?.find((player) => player.isHost)?.id ?? null;
          publishRoom = false;
          shouldRefresh = true;
        } else if (isTestController && currentRoom?.status !== "heroes" && room.meId !== capture.viewerId) {
          publishRoom = false;
          shouldRefresh = true;
        } else if (capture.viewerId && room.meId !== capture.viewerId) {
          publishRoom = false;
          shouldRefresh = true;
        }

        const nextToken = typeof raw.token === "string" && raw.token ? raw.token : capture.token;
        if (bootstrap && !nextToken) throw new Error("The game server returned an invalid session. Please try again.");
        if (targetViewer !== capture.viewerId || nextToken !== capture.token || bootstrap) {
          const changed = this.activateSession(room.code, nextToken, targetViewer ?? (bootstrap ? room.meId : capture.viewerId));
          capture = { ...changed, generation: this.generation, dispatchedAt: this.now() };
        }
        this.testController = Boolean(room.isTestController);

        const activeWrites = this.writesByRoom.get(write?.roomCode ?? capture.code);
        if (write?.conflicted || (activeWrites?.size ?? 0) > 1) {
          publishRoom = false;
          shouldRefresh = true;
        }
        if (publishRoom && this.isCurrent(capture) && this.callbacks.onRoom?.(room, "action")) {
          this.needsFreshSync = false;
          this.callbacks.onConnection?.(false);
          if (room.status === "finished") this.callbacks.trace?.("game-finished", {});
          this.callbacks.trace?.("room-action-published", { action });
          this.saveSession(input.name.trim());
        } else {
          this.needsFreshSync = true;
          shouldRefresh = true;
          if (publishRoom && !this.isCurrent(capture)) return false;
        }
        succeeded = true;
        }
      }
    } catch (cause) {
      if (!this.isCurrent(capture)) return false;
      commandError = cause instanceof Error ? cause.message : "Something went wrong.";
      if (traceId) this.callbacks.trace?.("gameplay-action-failure", { traceId, action, kind: cause instanceof Error ? cause.name : "unknown" });
      if (maintenance) console.warn("Timer maintenance did not advance; checking the authoritative room state.");
      else if (!background) this.callbacks.onError?.(commandError);
      if (roomReturning && this.session?.token) {
        this.needsFreshSync = true;
        shouldRefresh = true;
        this.callbacks.onConnection?.(true);
      } else if (bootstrap && this.session && !this.session.token) {
        this.retire("left", false);
      }
    } finally {
      if (write) {
        if (this.isCurrent(capture)) this.generation += 1;
        this.finishWrite(write);
      }
      if (!background && !maintenance) this.humanSubmissions.delete(identity);
      if (this.busyOwner?.identityKey === identity && this.busyOwner.id === submissionId && this.matchesSession(capture)) {
        this.busyOwner = null;
        this.callbacks.onBusy?.(false, null);
      }
    }

    if (shouldRefresh && this.matchesSession(capture) && this.session?.token) {
      const fresh = await this.refresh({ forceFresh: true, reason: refreshedStaleTimer ? "stale-timer-409" : "post-write-barrier" });
      if (!fresh && this.session?.token && !this.isCurrent(capture)) return false;
    }
    if (!succeeded && commandError && this.session && !this.needsFreshSync) this.needsFreshSync = false;
    return succeeded;
  }

  /** The separate inactivity maintenance POST never parses or publishes a Room. */
  async expireInactiveRoom(): Promise<void> {
    const capture = this.capture();
    if (!capture?.token) return;
    try {
      await this.timeoutFetch("/api/rooms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "expire_inactive_room", code: capture.code, token: capture.token }),
      });
    } catch { /* The next authenticated GET remains authoritative. */ }
  }

  retire(reason: "left" | "missing-room" | "invalid-session" = "left", clearSaved = true): void {
    const previous = this.view;
    this.abortReads();
    this.session = null;
    this.epoch += 1;
    this.generation = 0;
    this.needsFreshSync = false;
    this.testController = false;
    this.pollRecovery.reset();
    this.busyOwner = null;
    if (clearSaved) this.clearSavedSession();
    this.callbacks.onSessionChange?.(emptyView(this.epoch), previous);
    this.callbacks.onBusy?.(false, null);
    this.callbacks.onConnection?.(false);
    this.callbacks.onRetired?.(reason);
  }

  dispose(): void {
    this.abortReads();
    this.session = null;
    this.epoch += 1;
    this.generation = 0;
    this.needsFreshSync = false;
    this.pollRecovery.reset();
    this.busyOwner = null;
  }
}
