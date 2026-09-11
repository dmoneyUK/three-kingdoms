import { env } from "cloudflare:workers";

export const runtime = "edge";

export async function GET() {
  try {
    await env.DB.prepare("SELECT 1").first();
    return Response.json({ ok: true, database: "available" }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return Response.json({ ok: false, database: "unavailable" }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
