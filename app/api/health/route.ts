export const runtime = "edge";

export async function GET() {
  // Deployment smoke tests need to verify that the Worker can serve a
  // request. They do not need to turn a frequent availability probe into a
  // D1 read, so database-dependent checks remain in game requests instead.
  return Response.json({ ok: true, worker: "available" }, { headers: { "Cache-Control": "no-store" } });
}
