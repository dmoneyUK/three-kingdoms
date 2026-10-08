import { spawn, spawnSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../../", import.meta.url));
const statePath = mkdtempSync(join(tmpdir(), "wtk-browser-worker-"));
const migration = spawnSync("npx", ["wrangler", "d1", "migrations", "apply", "three-kingdoms-db", "--local", "--persist-to", statePath, "-c", "dist/server/wrangler.json"], { cwd: root, stdio: "inherit" });
if (migration.status !== 0) {
  rmSync(statePath, { recursive: true, force: true });
  process.exit(migration.status ?? 1);
}

const worker = spawn("npx", ["wrangler", "dev", "-c", "dist/server/wrangler.json", "--assets", "dist/client", "--port", "3137", "--inspector-port", "9137", "--local", "--persist-to", statePath, "--var", "WTK_TEST_CAPABILITIES:1", "--show-interactive-dev-session=false"], {
  cwd: root,
  env: { ...process.env, GAME_TEST_STATE_PATH: statePath, WRANGLER_LOG_PATH: join(root, ".wrangler", "browser-worker.log") },
  stdio: "inherit",
});
let shuttingDown = false;
worker.on("error", (error) => console.error(`[browser-worker] Failed to start Wrangler: ${error.stack ?? error.message}`));
worker.on("exit", (code, signal) => {
  if (!shuttingDown && (code !== 0 || signal)) {
    console.error(`[browser-worker] Wrangler exited unexpectedly (code=${code ?? "null"}, signal=${signal ?? "none"}).`);
  }
});

async function waitForWorker() {
  for (let attempt = 0; attempt < 120; attempt += 1) {
    if (worker.exitCode !== null) process.exit(worker.exitCode || 1);
    try {
      if ((await fetch("http://127.0.0.1:3137/")).ok) return;
    } catch {
      // Wrangler is still starting.
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  worker.kill("SIGTERM");
  rmSync(statePath, { recursive: true, force: true });
  throw new Error("Timed out waiting for the browser test Worker.");
}

function stop(signal = "SIGTERM") {
  shuttingDown = true;
  if (worker.exitCode === null) worker.kill(signal);
  rmSync(statePath, { recursive: true, force: true });
}

process.on("SIGINT", () => stop("SIGINT"));
process.on("SIGTERM", () => stop("SIGTERM"));
process.on("exit", () => { if (worker.exitCode === null) worker.kill("SIGTERM"); rmSync(statePath, { recursive: true, force: true }); });
await waitForWorker();
await new Promise(() => {});
