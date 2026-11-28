import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { RoomCommandGateway } from "../app/room-session/room-command-gateway.ts";

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}

function room(code = "ABCDE", meId = "player-1", overrides = {}) {
  return {
    code,
    meId,
    status: "playing",
    phase: "play",
    actionRevision: "revision-1",
    currentAction: { kind: "play", deadline: 1_000 },
    players: [{ id: "player-1", isHost: true }, { id: "player-2" }],
    myHand: [{ id: `private-${meId}` }],
    privateRole: `role-${meId}`,
    isTestController: false,
    ...overrides,
  };
}

function json(payload, status = 200) {
  return Response.json(payload, { status });
}

function nextTurn() {
  return new Promise((resolve) => setImmediate(resolve));
}

function memoryStorage(initial = {}) {
  const values = new Map(Object.entries(initial));
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key),
    values,
  };
}

function harness({ fetcher, code = "ABCDE", token = "credential-secret", callbacks = {}, clock } = {}) {
  const storage = memoryStorage({
    "three-realms-session": JSON.stringify({ code, token, name: "Player One" }),
  });
  const published = [];
  const roomAttempts = [];
  const sessionChanges = [];
  const busy = [];
  const errors = [];
  const connection = [];
  const traces = [];
  const gateway = new RoomCommandGateway({
    fetcher: fetcher ?? (async () => json(room(code))),
    normalize: (value) => value && typeof value === "object" ? value : null,
    storage: () => storage,
    now: clock?.now,
    setTimer: clock?.setTimer,
    clearTimer: clock?.clearTimer,
    timeoutMs: clock?.timeoutMs,
    callbacks: {
      onRoom: (value, source) => {
        const attempt = { value, source };
        roomAttempts.push(attempt);
        const accepted = callbacks.onRoom?.(value, source) ?? true;
        if (accepted) published.push(attempt);
        return accepted;
      },
      onSessionChange: (view, previous) => { sessionChanges.push({ view, previous }); callbacks.onSessionChange?.(view, previous); },
      onBusy: (value, action) => { busy.push({ value, action }); callbacks.onBusy?.(value, action); },
      onError: (value) => { errors.push(value); callbacks.onError?.(value); },
      onConnection: (value) => { connection.push(value); callbacks.onConnection?.(value); },
      onRetired: (value) => callbacks.onRetired?.(value),
      onSavedName: (value) => callbacks.onSavedName?.(value),
      trace: (event, data) => { traces.push({ event, data }); callbacks.trace?.(event, data); },
      traceId: () => callbacks.traceId?.() ?? null,
      onServerDiagnostic: (...args) => callbacks.onServerDiagnostic?.(...args),
    },
  });
  return { gateway, storage, published, roomAttempts, sessionChanges, busy, errors, connection, traces };
}

async function restore(h, value = room()) {
  return h.gateway.restoreSavedSession().then((result) => {
    assert.equal(result && result.meId, value.meId);
    return result;
  });
}

function fakeClock() {
  let time = 0;
  let id = 0;
  const timers = new Map();
  return {
    now: () => time,
    timeoutMs: 15,
    setTimer: (callback, delay = 0) => {
      const timerId = ++id;
      timers.set(timerId, { callback, at: time + Number(delay) });
      return timerId;
    },
    clearTimer: (timerId) => timers.delete(timerId),
    tick: (duration) => {
      time += duration;
      let fired = true;
      while (fired) {
        fired = false;
        for (const [timerId, timer] of timers) {
          if (timer.at <= time) {
            timers.delete(timerId);
            timer.callback();
            fired = true;
            break;
          }
        }
      }
    },
    get pending() { return timers.size; },
  };
}

test("Home can attach callbacks to its stable Gateway before restoring a session", async () => {
  const storage = memoryStorage({
    "three-realms-session": JSON.stringify({ code: "ABCDE", token: "credential-secret", name: "Player One" }),
  });
  const published = [];
  const gateway = new RoomCommandGateway({
    fetcher: async () => json(room()),
    normalize: (value) => value && typeof value === "object" ? value : null,
    storage: () => storage,
  });
  gateway.setCallbacks({ onRoom: (value) => { published.push(value); return true; } });

  const restored = await gateway.restoreSavedSession();

  assert.equal(restored && restored.meId, "player-1");
  assert.equal(published.length, 1);
  assert.equal(published[0].myHand[0].id, "private-player-1");
});

test("default fetch preserves the platform receiver for create POST and restored GET", async () => {
  const previousFetch = globalThis.fetch;
  const previousSetTimeout = globalThis.setTimeout;
  const previousClearTimeout = globalThis.clearTimeout;
  const requests = [];
  globalThis.setTimeout = function (callback, delay, ...args) {
    return Reflect.apply(previousSetTimeout, globalThis, [callback, delay, ...args]);
  };
  globalThis.clearTimeout = function (timer, ...args) {
    return Reflect.apply(previousClearTimeout, globalThis, [timer, ...args]);
  };
  globalThis.fetch = function (input, init = {}) {
    assert.strictEqual(this, globalThis, "default fetch must receive the platform global");
    const method = init.method ?? "GET";
    requests.push({ input: String(input), method, body: init.body ? JSON.parse(String(init.body)) : null });
    if (method === "POST") return Promise.resolve(json({ room: room("NEW22"), token: "created-token" }));
    const query = new URL(String(input), "https://local.test").searchParams;
    return Promise.resolve(json(room(query.get("code") ?? "")));
  };

  try {
    const createGateway = new RoomCommandGateway({
      normalize: (value) => value && typeof value === "object" ? value : null,
      storage: () => memoryStorage(),
      callbacks: { onRoom: () => true },
    });
    assert.equal(await createGateway.command({ action: "create", name: "Player One", code: "" }), true);

    const restoredPublications = [];
    const restoreGateway = new RoomCommandGateway({
      normalize: (value) => value && typeof value === "object" ? value : null,
      storage: () => memoryStorage({
        "three-realms-session": JSON.stringify({ code: "ABCDE", token: "saved-token", name: "Player One" }),
      }),
      callbacks: { onRoom: (value, source) => { restoredPublications.push({ value, source }); return true; } },
    });
    const restored = await restoreGateway.restoreSavedSession();

    assert.equal(requests.filter((request) => request.method === "POST" && request.body?.action === "create").length, 1);
    assert.equal(requests.filter((request) => request.method === "GET").length, 1);
    assert.equal(restored?.code, "ABCDE");
    assert.equal(restoredPublications.length, 1);
    assert.equal(restoredPublications[0].source, "poll");
    assert.equal(restoredPublications[0].value.meId, restored.meId);
  } finally {
    globalThis.fetch = previousFetch;
    globalThis.setTimeout = previousSetTimeout;
    globalThis.clearTimeout = previousClearTimeout;
  }
});

test("default timers preserve the platform receiver and clear each scheduled timeout", async () => {
  const previousFetch = globalThis.fetch;
  const previousSetTimeout = globalThis.setTimeout;
  const previousClearTimeout = globalThis.clearTimeout;
  const scheduled = [];
  const cleared = [];
  globalThis.fetch = async () => json(room("ABCDE"));
  globalThis.setTimeout = function (callback, delay) {
    assert.strictEqual(this, globalThis, "default setTimeout must receive the platform global");
    const timer = scheduled.length + 1;
    scheduled.push({ timer, callback, delay });
    return timer;
  };
  globalThis.clearTimeout = function (timer) {
    assert.strictEqual(this, globalThis, "default clearTimeout must receive the platform global");
    cleared.push(timer);
  };

  try {
    const published = [];
    const gateway = new RoomCommandGateway({
      normalize: (value) => value && typeof value === "object" ? value : null,
      storage: () => memoryStorage({
        "three-realms-session": JSON.stringify({ code: "ABCDE", token: "saved-token", name: "Player One" }),
      }),
      callbacks: { onRoom: (value) => { published.push(value); return true; } },
    });
    const restored = await gateway.restoreSavedSession();

    assert.equal(restored?.meId, "player-1");
    assert.equal(scheduled.length, 1);
    assert.equal(scheduled[0].delay, 15_000);
    assert.deepEqual(cleared, [scheduled[0].timer]);
    assert.equal(published.length, 1);
    assert.equal(published[0].code, "ABCDE");
  } finally {
    globalThis.fetch = previousFetch;
    globalThis.setTimeout = previousSetTimeout;
    globalThis.clearTimeout = previousClearTimeout;
  }
});

test("synchronous GET transport or timer failures do not strand a read flight", async () => {
  for (const failurePoint of ["fetch", "timer"]) {
    const storage = memoryStorage({
      "three-realms-session": JSON.stringify({ code: "ABCDE", token: "saved-token", name: "Player One" }),
    });
    let fetchCalls = 0;
    let timerCalls = 0;
    const published = [];
    const gateway = new RoomCommandGateway({
      fetcher: () => {
        fetchCalls++;
        if (failurePoint === "fetch" && fetchCalls === 1) throw new Error("synchronous fetch failure");
        return Promise.resolve(json(room("ABCDE")));
      },
      normalize: (value) => value && typeof value === "object" ? value : null,
      storage: () => storage,
      setTimer: () => {
        timerCalls++;
        if (failurePoint === "timer" && timerCalls === 1) throw new Error("synchronous timer failure");
        return timerCalls;
      },
      clearTimer: () => {},
      callbacks: { onRoom: (value) => { published.push(value); return true; } },
    });

    assert.equal(await gateway.restoreSavedSession(), false, `${failurePoint} failure should fail closed`);
    const recovered = await gateway.refresh({ reason: `recover-after-sync-${failurePoint}-failure` });
    assert.equal(recovered?.meId, "player-1", `${failurePoint} failure must allow the next GET`);
    assert.equal(gateway.stale, false);
    assert.equal(published.length, 1);
    assert.equal(fetchCalls, failurePoint === "fetch" ? 2 : 1);
  }
});

test("a synchronous command timer failure releases the submission lock for retry", async () => {
  let timerCalls = 0;
  let postCalls = 0;
  const gateway = new RoomCommandGateway({
    fetcher: async (_input, init = {}) => {
      assert.equal(init.method, "POST");
      postCalls++;
      return json({ room: room("NEW22"), token: "created-token" });
    },
    normalize: (value) => value && typeof value === "object" ? value : null,
    storage: () => memoryStorage(),
    setTimer: () => {
      timerCalls++;
      if (timerCalls === 1) throw new Error("synchronous timer failure");
      return timerCalls;
    },
    clearTimer: () => {},
    callbacks: { onRoom: () => true },
  });
  const create = { action: "create", name: "Player One", code: "" };

  assert.equal(await gateway.command(create), false);
  assert.equal(postCalls, 0);
  assert.equal(await gateway.command(create), true);
  assert.equal(postCalls, 1);
});

test("same identity and generation coalesce one GET and publish once", async () => {
  const pending = deferred();
  let calls = 0;
  const h = harness({ fetcher: async () => { calls++; return pending.promise; } });
  const first = h.gateway.restoreSavedSession();
  const second = h.gateway.refresh({ reason: "same-poll" });
  assert.equal(calls, 1);
  pending.resolve(json(room()));
  const [one, two] = await Promise.all([first, second]);
  assert.equal(one, two);
  assert.equal(calls, 1);
  assert.equal(h.published.length, 1);
});

test("concurrent fresh deadline reads share one read dispatched after their barrier", async () => {
  const freshRead = deferred();
  let calls = 0;
  const h = harness({ fetcher: async () => {
    calls++;
    return calls === 1 ? json(room()) : freshRead.promise;
  } });
  await restore(h);
  const first = h.gateway.refresh({ forceFresh: true, reason: "response-deadline" });
  const second = h.gateway.refresh({ forceFresh: true, reason: "shared-window-expiry" });
  assert.equal(calls, 2, "one bootstrap read plus one fresh barrier read");
  freshRead.resolve(json(room("ABCDE", "player-1", { currentAction: { kind: "play", deadline: 8_000 } })));
  const [one, two] = await Promise.all([first, second]);
  assert.equal(one, two);
  assert.equal(h.published.length, 2);
});

test("independent rooms and viewers retain separate private projections and credentials", async () => {
  const calls = [];
  const fetcher = async (url) => {
    const query = new URL(String(url), "https://local.test").searchParams;
    calls.push({ code: query.get("code"), token: query.get("token") });
    const code = query.get("code");
    return json(room(code, code === "ROOM1" ? "viewer-one" : "viewer-two", { privateRole: code }));
  };
  const first = harness({ fetcher, code: "ROOM1", token: "secret-one" });
  const second = harness({ fetcher, code: "ROOM2", token: "secret-two" });
  await Promise.all([first.gateway.restoreSavedSession(), second.gateway.restoreSavedSession()]);
  assert.equal(first.gateway.view.viewerId, "viewer-one");
  assert.equal(second.gateway.view.viewerId, "viewer-two");
  assert.equal(first.published[0].value.privateRole, "ROOM1");
  assert.equal(second.published[0].value.privateRole, "ROOM2");
  assert.equal("token" in first.gateway.view, false);
  assert.deepEqual(new Set(calls.map((call) => call.token)), new Set(["secret-one", "secret-two"]));
  assert.equal(JSON.stringify(first.traces).includes("secret-one"), false);
  assert.equal(JSON.stringify(second.traces).includes("secret-two"), false);
});

test("viewer switch retires pending GET and publishes only the selected private view", async () => {
  const pendingOld = deferred();
  let getCount = 0;
  const h = harness({ fetcher: async () => {
    getCount++;
    if (getCount === 2) return pendingOld.promise;
    return json(room("ABCDE", getCount === 1 ? "player-1" : "player-2"));
  } });
  await restore(h);
  const obsolete = h.gateway.refresh({ forceFresh: true, reason: "old-view-read" });
  const selected = h.gateway.refresh({ viewerId: "player-2", forceFresh: true, reason: "test-viewer-switch" });
  assert.equal(h.gateway.view.viewerId, "player-2");
  pendingOld.resolve(json(room("ABCDE", "player-1", { myHand: [{ id: "old-private-card" }] })));
  assert.equal(await obsolete, false);
  assert.equal(await selected && h.gateway.view.viewerId, "player-2");
  assert.equal(h.published.at(-1).value.meId, "player-2");
  assert.equal(JSON.stringify(h.published).includes("old-private-card"), false);
});

test("TEST restore chooses the host gameplay view and hero advance follows the server-selected seat", async () => {
  let getCount = 0;
  let postCount = 0;
  const h = harness({ fetcher: async (url) => {
    if (String(url).includes("?")) {
      getCount++;
      const selected = new URL(String(url), "https://local.test").searchParams.get("testViewerId");
      if (getCount === 1) return json(room("ABCDE", "test-seat", {
        status: "playing",
        isTestController: true,
        players: [{ id: "host", isHost: true }, { id: "test-seat", isTestPlayer: true }],
      }));
      return json(room("ABCDE", selected ?? "host", {
        isTestController: true,
        players: [{ id: "host", isHost: true }, { id: "test-seat", isTestPlayer: true }],
      }));
    }
    postCount++;
    return json({ room: room("ABCDE", "test-seat-2", {
      status: "heroes",
      isTestController: true,
      players: [{ id: "host", isHost: true }, { id: "test-seat-2", isTestPlayer: true }],
    }) });
  } });
  await h.gateway.restoreSavedSession();
  assert.equal(h.gateway.view.viewerId, "host");
  assert.equal(getCount, 2);
  assert.equal(h.published.length, 1, "the non-host startup projection is never published");
  assert.equal(h.published[0].value.meId, "host");

  // Move into the hero-selection controller projection, then verify that a
  // server-selected test seat is the one bound after a hero confirmation.
  const heroRoom = room("ABCDE", "test-seat", {
    status: "heroes",
    isTestController: true,
    players: [{ id: "host", isHost: true }, { id: "test-seat", isTestPlayer: true }],
  });
  const switched = await h.gateway.refresh({ viewerId: "test-seat", forceFresh: true, reason: "hero-view" });
  assert.equal(switched && switched.meId, "test-seat");
  assert.equal(await h.gateway.command({ action: "choose_hero", name: "Player One", code: "ABCDE", room: heroRoom, extra: { heroId: "hero-a" } }), true);
  assert.equal(postCount, 1);
  assert.equal(h.gateway.view.viewerId, "test-seat-2");
  assert.equal(h.published.at(-1).value.meId, "test-seat-2");
});

test("temporary GET failure retains the session; explicit invalid session retires it", async () => {
  let calls = 0;
  const temporary = harness({ fetcher: async () => {
    calls++;
    return calls === 1 ? json({ error: "Unavailable" }, 503) : json(room());
  } });
  assert.equal(await temporary.gateway.restoreSavedSession(), false);
  assert.equal(temporary.gateway.view.active, true);
  assert.equal(temporary.gateway.stale, true);
  assert.notEqual(temporary.storage.getItem("three-realms-session"), null);
  assert.equal(await temporary.gateway.refresh({ forceFresh: true, reason: "retry-after-503" }) && temporary.gateway.stale, false);
  assert.equal(temporary.published.length, 1);

  let retiredReason = null;
  const invalid = harness({ fetcher: async () => json({ error: "Your player session is no longer valid." }, 403), callbacks: {
    onRetired: (reason) => { retiredReason = reason; },
  } });
  assert.equal(await invalid.gateway.restoreSavedSession(), false);
  assert.equal(invalid.gateway.view.active, false);
  assert.equal(invalid.storage.getItem("three-realms-session"), null);
  assert.equal(retiredReason, "invalid-session");
});

test("same-view Home publication guard can reject a late public turn", async () => {
  let allow = true;
  let gets = 0;
  const h = harness({ fetcher: async () => { gets++; return json(room("ABCDE", "player-1", { publicPresentationTurn: { epoch: gets, startPublicSequence: null } })); }, callbacks: {
    onRoom: () => allow,
  } });
  await restore(h);
  allow = false;
  assert.equal(await h.gateway.refresh({ forceFresh: true, reason: "retired-turn" }), false);
  assert.equal(h.published.length, 1);
  assert.equal(h.roomAttempts.length, 2);
  assert.equal(h.gateway.stale, true, "rejected projection requires a coordinator refresh before commands can continue");
});

test("heartbeat and inactivity maintenance never publish a Room", async () => {
  let posts = 0;
  const h = harness({ fetcher: async (url) => String(url).includes("?") ? json(room()) : (posts++, json({ ok: true })) });
  await restore(h);
  const count = h.published.length;
  assert.equal(await h.gateway.command({ action: "heartbeat", name: "Player One", code: "ABCDE" }), true);
  await h.gateway.expireInactiveRoom();
  assert.equal(posts, 2);
  assert.equal(h.published.length, count);
});

test("leave and rejoin ignore late POST storage, error, and busy side effects", async () => {
  const oldPost = deferred();
  const newPost = deferred();
  let getCount = 0;
  let postCount = 0;
  const h = harness({ fetcher: async (url) => {
    if (String(url).includes("?")) { getCount++; return json(room(getCount === 1 ? "ABCDE" : "NEW22", "player-1")); }
    postCount++;
    return postCount === 1 ? oldPost.promise : newPost.promise;
  } });
  await restore(h);
  const late = h.gateway.command({ action: "play_card", name: "Player One", code: "ABCDE", room: room() });
  h.gateway.retire("left");
  const rejoin = h.gateway.command({ action: "join", name: "New Player", code: "NEW22" });
  await nextTurn();
  assert.equal(h.busy.at(-1).value, true);
  oldPost.resolve(json({ room: room("ABCDE"), token: "old-token" }));
  assert.equal(await late, false);
  assert.equal(h.busy.at(-1).value, true, "late finally cannot unlock the new submission");
  assert.equal(h.storage.getItem("three-realms-session"), null, "old response cannot save its credential");
  assert.equal(h.errors.every((value) => value === ""), true, "old response cannot set an error");
  newPost.resolve(json({ room: room("NEW22"), token: "new-token" }));
  assert.equal(await rejoin, true);
  const saved = JSON.parse(h.storage.getItem("three-realms-session"));
  assert.deepEqual(saved, { code: "NEW22", token: "new-token", name: "New Player" });
  assert.equal(h.gateway.view.roomCode, "NEW22");
});

test("a pre-write GET cannot overwrite the POST acknowledgement", async () => {
  const pendingRead = deferred();
  let getCount = 0;
  let postCount = 0;
  const h = harness({ fetcher: async (url) => {
    if (String(url).includes("?")) {
      getCount++;
      return getCount === 1 ? json(room()) : pendingRead.promise;
    }
    postCount++;
    return json({ room: room("ABCDE", "player-1", { actionRevision: "revision-2" }) });
  } });
  await restore(h);
  const oldRead = h.gateway.refresh({ reason: "deadline-read" });
  const action = h.gateway.command({ action: "play_card", name: "Player One", code: "ABCDE", room: room() });
  assert.equal(await action, true);
  pendingRead.resolve(json(room("ABCDE", "player-1", { actionRevision: "old-revision", myHand: [{ id: "late-old-card" }] })));
  assert.equal(await oldRead, false);
  assert.equal(postCount, 1);
  assert.equal(h.published.at(-1).value.actionRevision, "revision-2");
  assert.equal(JSON.stringify(h.published).includes("late-old-card"), false);
});

test("stale response-timer 409 reads after its barrier and preserves timer recovery success", async () => {
  const obsolete = deferred();
  const fresh = deferred();
  let getCount = 0;
  let postCount = 0;
  const h = harness({ fetcher: async (url) => {
    if (String(url).includes("?")) {
      getCount++;
      if (getCount === 1) return json(room());
      return getCount === 2 ? obsolete.promise : fresh.promise;
    }
    postCount++;
    return json({ error: "The response timer is stale.", stale: true }, 409);
  } });
  await restore(h);
  const prior = h.gateway.refresh({ reason: "pre-deadline" });
  const timer = h.gateway.command({ action: "start_response_timer", name: "Player One", code: "ABCDE", room: room() });
  await nextTurn();
  assert.equal(getCount, 3, "the post-409 fresh GET is distinct from the pre-barrier read");
  obsolete.resolve(json(room("ABCDE", "player-1", { actionRevision: "obsolete" })));
  assert.equal(await prior, false);
  fresh.resolve(json(room("ABCDE", "player-1", { actionRevision: "fresh-after-409" })));
  assert.equal(await timer, true);
  assert.equal(postCount, 1, "the stale timer command is never replayed");
  assert.equal(h.published.at(-1).value.actionRevision, "fresh-after-409");
});

test("a timed-out POST is sent once, then requires a fresh authenticated read", async () => {
  const clock = fakeClock();
  let postCount = 0;
  let getCount = 0;
  const h = harness({ clock, fetcher: async (url, init = {}) => {
    if (String(url).includes("?")) { getCount++; return json(room()); }
    postCount++;
    return new Promise((resolve, reject) => {
      init.signal.addEventListener("abort", () => reject(init.signal.reason), { once: true });
    });
  } });
  await restore(h);
  const command = h.gateway.command({ action: "play_card", name: "Player One", code: "ABCDE", room: room() });
  clock.tick(15);
  assert.equal(await command, false);
  assert.equal(postCount, 1);
  assert.equal(getCount, 2, "the command performs one authoritative read after the unknown outcome");
  assert.equal(h.gateway.stale, false, "fresh room state releases the command gate");
});

test("stale gameplay 409 and business 409 keep their own errors and never replay", async () => {
  for (const error of ["This action is stale.", "The room is full."]) {
    let posts = 0;
    let gets = 0;
    const h = harness({ fetcher: async (url) => {
      if (String(url).includes("?")) { gets++; return json(room()); }
      posts++;
      return json({ error }, 409);
    } });
    await restore(h);
    assert.equal(await h.gateway.command({ action: "play_card", name: "Player One", code: "ABCDE", room: room() }), false);
    assert.equal(posts, 1);
    assert.equal(gets, 2, "the write barrier recovers the current room without replaying the POST");
    assert.equal(h.errors.at(-1), error);
  }
});

test("overlapping preview or timer maintenance and human writes drain to one fresh GET", async () => {
  for (const maintenanceAction of ["preview_harvest", "advance_timers"]) {
    const maintenancePost = deferred();
    const humanPost = deferred();
    let gets = 0;
    const h = harness({ fetcher: async (url, init = {}) => {
      if (String(url).includes("?")) { gets++; return json(room("ABCDE", "player-1", { actionRevision: `fresh-${gets}` })); }
      const action = JSON.parse(init.body).action;
      return action === maintenanceAction ? maintenancePost.promise : humanPost.promise;
    } });
    await restore(h);
    const maintenance = h.gateway.command({ action: maintenanceAction, name: "Player One", code: "ABCDE", room: room() });
    const human = h.gateway.command({ action: "play_card", name: "Player One", code: "ABCDE", room: room() });
    humanPost.resolve(json({ room: room("ABCDE", "player-1", { actionRevision: "human-ack" }) }));
    await Promise.resolve();
    maintenancePost.resolve(json({ room: room("ABCDE", "player-1", { actionRevision: `${maintenanceAction}-old` }) }));
    const results = await Promise.all([maintenance, human]);
    assert.deepEqual(results, [true, true]);
    assert.equal(gets, 2, "exactly one post-drain GET follows the two conflicting writes");
    assert.equal(h.published.some((entry) => ["preview_harvest-old", "advance_timers-old", "human-ack"].includes(entry.value.actionRevision)), false);
    assert.equal(h.published.at(-1).value.actionRevision, "fresh-2");
  }
});

test("a human submission is locked per session while another viewer remains independent", async () => {
  const firstPost = deferred();
  const secondPost = deferred();
  let posts = 0;
  const fetcher = async (url) => {
    if (String(url).includes("?")) return json(room(String(url).includes("ROOM2") ? "ROOM2" : "ABCDE", String(url).includes("ROOM2") ? "player-2" : "player-1"));
    posts++;
    return posts === 1 ? firstPost.promise : secondPost.promise;
  };
  const first = harness({ fetcher, code: "ABCDE", token: "first" });
  const second = harness({ fetcher, code: "ROOM2", token: "second" });
  await Promise.all([first.gateway.restoreSavedSession(), second.gateway.restoreSavedSession()]);
  const firstAction = first.gateway.command({ action: "play_card", name: "One", code: "ABCDE", room: room() });
  assert.equal(await first.gateway.command({ action: "play_card", name: "One", code: "ABCDE", room: room() }), false);
  const secondAction = second.gateway.command({ action: "play_card", name: "Two", code: "ROOM2", room: room("ROOM2", "player-2") });
  assert.equal(posts, 2, "a separate viewer session is not held by the first session lock");
  firstPost.resolve(json({ room: room("ABCDE", "player-1", { actionRevision: "first-ack" }) }));
  secondPost.resolve(json({ room: room("ROOM2", "player-2", { actionRevision: "second-ack" }) }));
  assert.deepEqual(await Promise.all([firstAction, secondAction]), [true, true]);
});

test("same action revision does not suppress new deadlines or preview facts", async () => {
  let posts = 0;
  const h = harness({ fetcher: async (url) => {
    if (String(url).includes("?")) return json(room("ABCDE", "player-1", { actionRevision: "same" }));
    posts++;
    return json({ room: room("ABCDE", "player-1", {
      actionRevision: "same",
      currentAction: { kind: "play", deadline: 9_000, preview: { cardCount: 2 } },
    }) });
  } });
  await restore(h);
  assert.equal(await h.gateway.command({ action: "play_card", name: "Player One", code: "ABCDE", room: room() }), true);
  const accepted = h.published.at(-1).value;
  assert.equal(accepted.actionRevision, "same");
  assert.equal(accepted.currentAction.deadline, 9_000);
  assert.deepEqual(accepted.currentAction.preview, { cardCount: 2 });
  assert.equal(posts, 1);
});

test("Home delegates transport and sole publication to the Gateway while retaining cadence", () => {
  const source = readFileSync(new URL("../app/page.tsx", import.meta.url), "utf8");
  const home = source.slice(source.indexOf("export default function Home()"), source.indexOf("\nfunction Brand()"));
  assert.match(home, /gateway\.command\(\{ action, name, code, extra, context, room: currentRoom \}\)/);
  assert.match(home, /gateway\.refresh\(options\)/);
  assert.match(home, /gateway\.setCallbacks\(\{/);
  assert.match(home, /gateway\.expireInactiveRoom\(\)/);
  assert.match(home, /acceptPublicPresentationTurn\(nextRoom\)/);
  assert.match(home, /visibility-resume/);
  assert.match(home, /UI_TIMING\.hiddenPoll/);
  assert.match(home, /UI_TIMING\.activeGamePoll/);
  assert.equal(home.includes("fetch(\"/api/rooms\""), false);
  assert.equal(home.includes("localStorage"), false);
  assert.equal(home.includes("new RoomPollRecovery"), false);
  assert.equal((home.match(/setRoom\(/g) ?? []).length, 2, "only identity retirement and the Gateway publication callback write Home's Room snapshot");
});
