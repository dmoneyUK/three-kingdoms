import { spawn, spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, statSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import { hasKnownProxyDisconnect, MAX_KNOWN_PROXY_RESTARTS, shouldRestartAfterKnownProxyDisconnect } from "./wrangler-worker-restart-policy.mjs";

const root = fileURLToPath(new URL("../../", import.meta.url));
const statePath = mkdtempSync(join(tmpdir(), "wtk-browser-worker-"));
const wranglerCli = join(root, "node_modules", "wrangler", "bin", "wrangler.js");
const migration = spawnSync(process.execPath, [wranglerCli, "d1", "migrations", "apply", "three-kingdoms-db", "--local", "--persist-to", statePath, "-c", "dist/server/wrangler.json"], { cwd: root, stdio: "inherit" });
if (migration.status !== 0) {
  rmSync(statePath, { recursive: true, force: true });
  process.exit(migration.status ?? 1);
}

const workerLogPath = join(root, ".wrangler", "browser-worker.log");
let worker = null;
let shuttingDown = false;

function startWorker() {
  worker = spawn(process.execPath, [wranglerCli, "dev", "-c", "dist/server/wrangler.json", "--assets", "dist/client", "--port", "3137", "--inspector-port", "9137", "--local", "--persist-to", statePath, "--var", "WTK_TEST_CAPABILITIES:1", "--show-interactive-dev-session=false"], {
    cwd: root,
    env: { ...process.env, GAME_TEST_STATE_PATH: statePath, WRANGLER_LOG_PATH: workerLogPath },
    stdio: "inherit",
  });
  worker.on("error", (error) => console.error(`[browser-worker] Failed to start Wrangler: ${error.stack ?? error.message}`));
  return worker;
}

function workerLogSize() {
  try { return statSync(workerLogPath).size; }
  catch { return 0; }
}

function readWorkerLogFrom(offset) {
  try {
    const log = readFileSync(workerLogPath);
    return log.subarray(offset <= log.length ? offset : 0).toString("utf8");
  } catch { return ""; }
}

async function waitForWorker(currentWorker) {
  for (let attempt = 0; attempt < 120; attempt += 1) {
    if (currentWorker.exitCode !== null || currentWorker.signalCode !== null) return false;
    try {
      if ((await fetch("http://127.0.0.1:3137/")).ok) return true;
    } catch {
      // Wrangler is still starting.
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  currentWorker.kill("SIGTERM");
  throw new Error("Timed out waiting for the browser test Worker.");
}

async function runWorkerUntilExit() {
  const currentWorker = startWorker();
  const exited = new Promise((resolve) => currentWorker.once("exit", (code, signal) => resolve({ code, signal })));
  const ready = await waitForWorker(currentWorker);
  if (!ready) return { ...(await exited), wasReady: false, log: readWorkerLogFrom(0) };
  const logOffset = workerLogSize();
  return { ...(await exited), wasReady: true, log: readWorkerLogFrom(logOffset) };
}

async function superviseWorker() {
  let restartCount = 0;
  while (!shuttingDown) {
    const result = await runWorkerUntilExit();
    if (shuttingDown) return;
    if (process.env.CI && shouldRestartAfterKnownProxyDisconnect({ ...result, restartCount })) {
      restartCount += 1;
      console.error(`[browser-worker] Restarting Wrangler after known ProxyWorker network disconnect (${restartCount}/${MAX_KNOWN_PROXY_RESTARTS}).`);
      continue;
    }
    const knownProxyDisconnect = hasKnownProxyDisconnect(result.log);
    const failureContext = knownProxyDisconnect
      ? ` after the known ProxyWorker network disconnect; restart cap is ${MAX_KNOWN_PROXY_RESTARTS}`
      : "";
    console.error(`[browser-worker] Wrangler exited unexpectedly${failureContext} (code=${result.code ?? "null"}, signal=${result.signal ?? "none"}).`);
    process.exitCode = 1;
    return;
  }
}

function stop(signal = "SIGTERM") {
  shuttingDown = true;
  if (worker?.exitCode === null && worker.signalCode === null) worker.kill(signal);
  rmSync(statePath, { recursive: true, force: true });
}

process.on("SIGINT", () => stop("SIGINT"));
process.on("SIGTERM", () => stop("SIGTERM"));
process.on("exit", () => { if (worker?.exitCode === null && worker.signalCode === null) worker.kill("SIGTERM"); rmSync(statePath, { recursive: true, force: true }); });
await superviseWorker();
