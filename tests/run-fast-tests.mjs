import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { performance } from "node:perf_hooks";

const fastTests = [
  "tests/free-budget-benchmark.test.mjs",
  "tests/bot-diagnostics.test.mjs",
  "tests/postwrite-bot-scheduler.test.mjs",
  "tests/room-log-decode.test.mjs",
  "tests/equipment-arrival.test.mjs",
  "tests/dying.test.mjs",
  "tests/ai-decision-prototype.test.mjs",
  "tests/ai-response-candidates.test.mjs",
  "tests/ai-play-candidates.test.mjs",
  "tests/ai-trigger-selection.test.mjs",
  "tests/ai-standard-coverage.test.mjs",
  "tests/ai-decision-router.test.mjs",
  "tests/ai-offline-benchmark.test.mjs",
  "tests/standard-deck.test.mjs",
  "tests/test-hand-presets.test.mjs",
  "tests/private-hand.test.mjs",
  "tests/game-messages.test.mjs",
  "tests/response-capabilities.test.mjs",
  "tests/distance-capabilities.test.mjs",
  "tests/deck-reorder.test.mjs",
  "tests/targeting-capabilities.test.mjs",
  "tests/room-safety.test.mjs",
  "tests/room-poll-recovery.test.mjs",
  "tests/game-screen-recovery.test.mjs",
  "tests/local-precommit-selection.test.mjs",
  "tests/shared-response-window.test.mjs",
  "tests/shared-response-commit.test.mjs",
  "tests/room-safety-render.test.mjs",
  "tests/active-skill-interactions.test.mjs",
  "tests/presentation-v2.test.mjs",
  "tests/entourage-presentation.test.mjs",
  "tests/presentation-snapshot.test.mjs",
  "tests/presentation-client.test.mjs",
  "tests/public-presentation-routing.test.mjs",
  "tests/public-presentation-turn.test.mjs",
  "tests/public-equipment-transition.test.mjs",
  "tests/public-discard-transition.test.mjs",
  "tests/public-hand-reveal-transition.test.mjs",
  "tests/public-target-card-settlement-lifecycle.test.mjs",
  "tests/presentation-causality.test.mjs",
  "tests/causal-context.test.mjs",
  "tests/attack-dodge-ux-trace.test.mjs",
  "tests/public-card-announcement.test.mjs",
  "tests/public-card-effect-frame-layout.test.mjs",
  "tests/public-stage-layout.test.mjs",
  "tests/verified-player-copy.test.mjs",
  "tests/public-card-effect-frame-view.test.mjs",
  "tests/wrangler-worker-supervisor.test.mjs",
  "tests/browser/staging-room-reconnect-logic.test.mjs",
];

// rendered-html exercises the built SSR bundle, so test:fast includes it when
// a build already exists (test:all builds first) while remaining build-free on
// a fresh checkout.
if (existsSync("dist/server/index.js")) fastTests.push("tests/rendered-html.test.mjs");

const startedAt = performance.now();
const child = spawn(process.execPath, ["--import", "tsx", "--test", "--test-concurrency=1", ...fastTests], {
  stdio: ["ignore", "pipe", "pipe"],
});
let output = "";
for (const stream of [child.stdout, child.stderr]) stream.on("data", (chunk) => { const text = chunk.toString(); output += text; process.stdout.write(text); });

const exitCode = await new Promise((resolve) => child.on("exit", (code) => resolve(code ?? 1)));
const durationMs = performance.now() - startedAt;
const testCount = Number(output.match(/^\s*(?:#|ℹ)\s+tests\s+(\d+)\s*$/m)?.[1] ?? 0);
console.log(`\nTiming: fast tests=${testCount}, duration=${(durationMs / 1000).toFixed(2)}s, files=${fastTests.length}`);
process.exit(exitCode);
