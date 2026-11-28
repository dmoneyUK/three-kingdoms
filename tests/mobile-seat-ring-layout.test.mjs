import assert from "node:assert/strict";
import test from "node:test";
import {
  calculateMobileSeatRingMetrics,
  isMobileSeatRingEnabled,
  mobileSeatRingTopology,
  subscribeMobileSeatRingMeasurements,
} from "../app/layout/mobile-seat-ring.ts";

const metricInput = (overrides = {}) => ({
  totalPlayers: 6,
  viewportWidth: 390,
  boardWidth: 340,
  boardTop: 120.13,
  tableTop: 10.13,
  seatHeight: 72.13,
  rowGap: "8px",
  borderLeftWidth: "1px",
  borderRightWidth: "1px",
  paddingLeft: "8px",
  paddingRight: "8px",
  ...overrides,
});

test("mobile seat-ring metrics preserve measured dimensions and quarter-pixel rounding", () => {
  assert.deepEqual(calculateMobileSeatRingMetrics(metricInput()), {
    topCapacity: 4,
    boardWidth: 340,
    boardTopInset: 110,
    seatWidth: 60.5,
    seatHeight: 72.25,
    gap: 8,
    leftInset: 8,
    topStep: 87.25,
  });
  assert.equal(calculateMobileSeatRingMetrics(metricInput({ rowGap: "30px" }))?.gap, 12);
  assert.equal(calculateMobileSeatRingMetrics(metricInput({ rowGap: "1px" }))?.gap, 4);
});

test("phone ring support and 4–10 player topology keep the existing legacy caps", () => {
  assert.equal(isMobileSeatRingEnabled(true, 4), false, "four-player top-row topology stays intact");
  for (const count of [5, 6, 7, 8, 9, 10]) assert.equal(isMobileSeatRingEnabled(true, count), true);
  assert.equal(isMobileSeatRingEnabled(false, 6), false);
  assert.equal(isMobileSeatRingEnabled(true, 11), false);

  assert.deepEqual(mobileSeatRingTopology(6, 4, true), {
    topCapacity: 4, renderedTopCount: 4, sideSeatCount: 1, sideRowCount: 1,
  });
  assert.deepEqual(mobileSeatRingTopology(7, 6, true), {
    topCapacity: 6, renderedTopCount: 4, sideSeatCount: 2, sideRowCount: 1,
  });
  assert.deepEqual(mobileSeatRingTopology(8, 7, true), {
    topCapacity: 7, renderedTopCount: 5, sideSeatCount: 2, sideRowCount: 1,
  });
  assert.deepEqual(mobileSeatRingTopology(9, 3, true), {
    topCapacity: 3, renderedTopCount: 3, sideSeatCount: 5, sideRowCount: 3,
  });
  assert.deepEqual(mobileSeatRingTopology(10, 8, true), {
    topCapacity: 8, renderedTopCount: 8, sideSeatCount: 1, sideRowCount: 1,
  });
  assert.deepEqual(mobileSeatRingTopology(6, 4, false), {
    topCapacity: 0, renderedTopCount: 0, sideSeatCount: 0, sideRowCount: 0,
  });
});

test("invalid or negative measurements fail closed without producing seat geometry", () => {
  for (const invalid of [
    { boardWidth: -1 },
    { boardWidth: 0 },
    { seatHeight: -1 },
    { seatHeight: 0 },
    { viewportWidth: Number.NaN },
    { boardTop: Number.POSITIVE_INFINITY },
    { boardWidth: 20, borderLeftWidth: "10px", borderRightWidth: "10px" },
    { totalPlayers: 11 },
  ]) assert.equal(calculateMobileSeatRingMetrics(metricInput(invalid)), null);
});

function measurementFixture() {
  const rect = (values) => ({ ...values });
  const table = { getBoundingClientRect: () => rect({ top: 10, width: 390, height: 700 }) };
  const seat = { getBoundingClientRect: () => rect({ top: 120, width: 66, height: 72 }) };
  const board = {
    getBoundingClientRect: () => rect({ top: 120, width: 340, height: 170 }),
    querySelector: (selector) => {
      assert.equal(selector, ".opponent-player-card");
      return seat;
    },
    closest: (selector) => {
      assert.equal(selector, ".play-table");
      return table;
    },
  };
  let viewportWidth = 390;
  let resizeListener = null;
  let nextFrame = 1;
  const frames = new Map();
  const canceledFrames = [];
  const observers = [];
  let addedResizeListeners = 0;
  let removedResizeListeners = 0;
  const runtime = {
    createResizeObserver(callback) {
      const observer = {
        callback,
        targets: [],
        disconnected: false,
        observe(target) { this.targets.push(target); },
        disconnect() { this.disconnected = true; },
        notify() { this.callback(); },
      };
      observers.push(observer);
      return observer;
    },
    requestAnimationFrame(callback) {
      const frame = nextFrame++;
      frames.set(frame, callback);
      return frame;
    },
    cancelAnimationFrame(frame) {
      canceledFrames.push(frame);
      frames.delete(frame);
    },
    addResizeListener(listener) {
      addedResizeListeners += 1;
      resizeListener = listener;
    },
    removeResizeListener(listener) {
      removedResizeListeners += 1;
      if (resizeListener === listener) resizeListener = null;
    },
    viewportWidth: () => viewportWidth,
    getComputedStyle: () => ({
      rowGap: "8px", borderLeftWidth: "1px", borderRightWidth: "1px",
      paddingLeft: "8px", paddingRight: "8px",
    }),
  };
  return {
    board,
    seat,
    observers,
    frames,
    canceledFrames,
    runtime,
    setViewportWidth(value) { viewportWidth = value; },
    resize() { resizeListener?.(); },
    flushFrames() {
      const scheduled = [...frames.values()];
      frames.clear();
      scheduled.forEach((callback) => callback());
    },
    listenerCounts: () => ({ addedResizeListeners, removedResizeListeners }),
  };
}

test("shared seat-ring subscription coalesces observer and resize callbacks and follows rotation", () => {
  const fixture = measurementFixture();
  const published = [];
  const unsubscribe = subscribeMobileSeatRingMeasurements({
    board: fixture.board,
    totalPlayers: 6,
    onMetrics: (metrics) => published.push(metrics),
  }, fixture.runtime);

  assert.equal(fixture.observers.length, 1, "one ResizeObserver owns the seat-ring targets");
  assert.deepEqual(fixture.observers[0].targets, [fixture.board, fixture.seat]);
  assert.equal(fixture.listenerCounts().addedResizeListeners, 1);
  assert.equal(published.length, 1, "initial layout is measured synchronously");

  fixture.resize();
  fixture.resize();
  fixture.observers[0].notify();
  fixture.observers[0].notify();
  assert.equal(fixture.frames.size, 1, "one frame is queued for the callback burst");
  fixture.flushFrames();
  assert.equal(published.length, 2, "the callback burst produces one measurement");

  fixture.setViewportWidth(430);
  fixture.resize();
  fixture.flushFrames();
  assert.equal(published.length, 3);
  assert.notEqual(published[2].seatWidth, published[1].seatWidth, "rotation remeasures viewport-dependent seat width");

  unsubscribe();
  assert.equal(fixture.observers[0].disconnected, true);
  assert.deepEqual(fixture.listenerCounts(), { addedResizeListeners: 1, removedResizeListeners: 1 });
  fixture.resize();
  fixture.observers[0].notify();
  assert.equal(fixture.frames.size, 0, "retired identity ignores later observer and resize callbacks");
});

test("shared seat-ring subscription cancels a pending frame and retires callbacks on unmount", () => {
  const fixture = measurementFixture();
  const published = [];
  const unsubscribe = subscribeMobileSeatRingMeasurements({
    board: fixture.board,
    totalPlayers: 6,
    onMetrics: (metrics) => published.push(metrics),
  }, fixture.runtime);
  fixture.resize();
  assert.equal(fixture.frames.size, 1);
  unsubscribe();
  assert.deepEqual(fixture.canceledFrames, [1]);
  fixture.flushFrames();
  assert.equal(published.length, 1, "a canceled frame cannot publish after cleanup");
  fixture.observers[0].notify();
  assert.equal(fixture.frames.size, 0);
});
