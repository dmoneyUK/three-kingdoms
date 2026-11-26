import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, relative } from "node:path";
import { redactSensitiveText } from "./staging-room-reconnect-diagnostics.mjs";

const ALLOWED = /^(?:staging-rejoin-diagnostics(?:[-_][A-Za-z0-9.-]+)?|staging-safe-summary)\.(?:json|txt)$/i;
const FORBIDDEN = /(?:https?:\/\/|bearer\s+|authorization\s*[:=]|cookie\s*[:=]|(?:session[_-]?token|access[_-]?token|room[_-]?token|token)\s*[:=]\s*(?!\[REDACTED\]))/i;

export function sanitizeStagingArtifact(name, value, secrets = []) {
  if (typeof name !== "string" || !ALLOWED.test(name)) return null;
  const text = redactSensitiveText(typeof value === "string" ? value : JSON.stringify(value ?? null), secrets);
  if (FORBIDDEN.test(text) || /(?:\.har|trace|screenshot|network)/i.test(name)) throw new Error("staging artifact safety scan failed");
  return text;
}

async function filesUnder(root) {
  const entries = await readdir(root, { withFileTypes: true }).catch(() => []);
  const files = [];
  for (const entry of entries) {
    const path = join(root, entry.name);
    if (entry.isDirectory()) files.push(...await filesUnder(path));
    else files.push(path);
  }
  return files;
}

/** Copy only an explicit, sanitized allowlist into the CI upload directory. */
export async function prepareSanitizedStagingArtifacts({ inputDir, outputDir, secrets = [] } = {}) {
  if (typeof inputDir !== "string" || typeof outputDir !== "string") throw new Error("artifact directories are required");
  await mkdir(outputDir, { recursive: true, mode: 0o700 });
  const copied = [];
  for (const source of await filesUnder(inputDir)) {
    const name = source.split(/[/\\]/).pop() ?? "";
    if (!ALLOWED.test(name)) continue;
    const sanitized = sanitizeStagingArtifact(name, await readFile(source, "utf8"), secrets);
    if (sanitized === null) continue;
    const destination = join(outputDir, name);
    await mkdir(dirname(destination), { recursive: true, mode: 0o700 });
    await writeFile(destination, sanitized, { encoding: "utf8", mode: 0o600 });
    copied.push(relative(outputDir, destination));
  }
  return copied.sort();
}
