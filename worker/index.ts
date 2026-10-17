/** Cloudflare Worker entry point for the vinext-starter template. */
import { handleImageOptimization, DEFAULT_DEVICE_SIZES, DEFAULT_IMAGE_SIZES } from "vinext/server/image-optimization";
import handler from "vinext/server/app-router-entry";
import { seedPlayingGame, type SeedPlayingGameInput } from "./test-playing-game";

interface Env {
  ASSETS: Fetcher;
  DB: D1Database;
  WTK_TEST_CAPABILITIES?: string;
  IMAGES: {
    input(stream: ReadableStream): {
      transform(options: Record<string, unknown>): {
        output(options: { format: string; quality: number }): Promise<{ response(): Response }>;
      };
    };
  };
}

let testCapabilityCleanup: (() => void) | null = null;
let testCapabilitySetup: Promise<void> | null = null;

async function setupTestCapabilities(env: Env) {
  if (env.WTK_TEST_CAPABILITIES !== "1" || testCapabilityCleanup) return;
  testCapabilitySetup ??= import("../game/capabilities/test-fixtures").then(({ registerTestSemanticCapabilities }) => {
    testCapabilityCleanup = registerTestSemanticCapabilities();
  });
  await testCapabilitySetup;
}

interface ExecutionContext {
  waitUntil(promise: Promise<unknown>): void;
  passThroughOnException(): void;
}

// Image security config. SVG sources with .svg extension auto-skip the
// optimization endpoint on the client side (served directly, no proxy).
// To route SVGs through the optimizer (with security headers), set
// dangerouslyAllowSVG: true in next.config.js and uncomment below:
// const imageConfig: ImageConfig = { dangerouslyAllowSVG: true };

const worker = {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/__test/cleanup-capabilities" && env.WTK_TEST_CAPABILITIES === "1") {
      testCapabilityCleanup?.();
      testCapabilityCleanup = null;
      testCapabilitySetup = null;
      return new Response("ok");
    }
    if (url.pathname === "/__test/seed-playing-game" && env.WTK_TEST_CAPABILITIES === "1" && request.method === "POST") {
      const body = await request.json<SeedPlayingGameInput>().catch(() => ({}));
      try {
        return Response.json(await seedPlayingGame(env.DB, body));
      } catch (error) {
        return Response.json({ error: error instanceof Error ? error.message : "Invalid test fixture." }, { status: 400 });
      }
    }
    if (url.pathname === "/__test/negation-window-clock" && env.WTK_TEST_CAPABILITIES === "1" && request.method === "POST") {
      const body = await request.json<{ code?: unknown; windowId?: unknown; mode?: unknown }>().catch(() => ({}));
      if (typeof body.code !== "string" || typeof body.windowId !== "string" || body.mode !== "hold" && body.mode !== "expire") {
        return Response.json({ error: "A room code, shared Negation window ID, and clock mode are required." }, { status: 400 });
      }
      const room = await env.DB.prepare("SELECT id, phase, pending_json FROM rooms WHERE code = ?").bind(body.code).first<{ id: string; phase: string; pending_json: string | null }>();
      if (!room?.pending_json) return Response.json({ adjusted: false, reason: "room-or-pending-missing" });
      let pending: { kind?: unknown; windowId?: unknown; settlement?: unknown };
      try {
        pending = JSON.parse(room.pending_json) as typeof pending;
      } catch {
        return Response.json({ adjusted: false, reason: "pending-invalid" });
      }
      if (room.phase !== "response" || pending.kind !== "negation_window" || pending.windowId !== body.windowId || pending.settlement != null) {
        return Response.json({ adjusted: false, reason: "window-not-open", phase: room.phase, kind: pending.kind });
      }
      const deadline = body.mode === "hold" ? Date.now() + 60_000 : Date.now() - 1;
      const updated = await env.DB.prepare(
        "UPDATE rooms SET pending_json = json_set(pending_json, '$.openedAt', ?, '$.deadline', ?) WHERE id = ? AND phase = 'response' AND pending_json = ?",
      ).bind(deadline - 8_000, deadline, room.id, room.pending_json).run();
      const stored = await env.DB.prepare("SELECT phase, pending_json FROM rooms WHERE id = ?").bind(room.id).first<{ phase: string; pending_json: string | null }>();
      const storedPending = stored?.pending_json ? JSON.parse(stored.pending_json) as { kind?: unknown; windowId?: unknown; openedAt?: unknown; deadline?: unknown } : null;
      const adjusted = stored?.phase === "response"
        && storedPending?.kind === "negation_window"
        && storedPending.windowId === body.windowId
        && storedPending.openedAt === deadline - 8_000
        && storedPending.deadline === deadline;
      return Response.json({ adjusted, ...(adjusted ? {} : { reason: "window-changed", reportedChanges: updated.meta.changes ?? null }) });
    }
    await setupTestCapabilities(env);

    if (url.pathname === "/_vinext/image") {
      const allowedWidths = [...DEFAULT_DEVICE_SIZES, ...DEFAULT_IMAGE_SIZES];
      return handleImageOptimization(request, {
        fetchAsset: (path) => env.ASSETS.fetch(new Request(new URL(path, request.url))),
        transformImage: async (body, { width, format, quality }) => {
          const result = await env.IMAGES.input(body).transform(width > 0 ? { width } : {}).output({ format, quality });
          return result.response();
        },
      }, allowedWidths);
    }

    return handler.fetch(request, env, ctx);
  },
};

export default worker;
