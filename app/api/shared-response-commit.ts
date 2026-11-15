import { AsyncLocalStorage } from "node:async_hooks";

export type SharedResponseCommit = { roomId: string; expectedPending: string; claimId: string };
const scope = new AsyncLocalStorage<SharedResponseCommit>();
export const currentSharedResponseCommit = () => scope.getStore();
export function withSharedResponseCommit<T>(claim: SharedResponseCommit, work: () => Promise<T>): Promise<T> {
  return scope.run(claim, work);
}

/** Guard ALL legacy resolver writes under the selected window's lease. The
 * durable marker permits its normal nested continuations after the atomic
 * physical-card/HP/room batch, but never authorizes a different shared window.
 * Outside this narrowly scoped server invocation the database is unchanged. */
export function sharedResponseDatabase(database: D1Database): D1Database {
  const claim = scope.getStore();
  if (!claim) return database;
  const guard = `EXISTS (SELECT 1 FROM rooms AS shared_guard WHERE shared_guard.id = ? AND
    ((shared_guard.pending_json = ? AND json_extract(shared_guard.pending_json, '$.settlement.claimId') = ?
      AND json_extract(shared_guard.pending_json, '$.settlement.leaseUntil') > ?)
     OR (COALESCE(json_extract(shared_guard.pending_json, '$.kind'), '') != 'shared_response_window'
      AND shared_guard.shared_response_commit_id = ?)))`;
  const parameters = () => [claim.roomId, claim.expectedPending, claim.claimId, Date.now(), claim.claimId];
  const marker = () => database.prepare(`UPDATE rooms SET shared_response_commit_id = ? WHERE id = ? AND ${guard}`)
    .bind(claim.claimId, claim.roomId, ...parameters());
  const prepare = (sql: string): D1PreparedStatement => {
    if (/^\s*SELECT\b/i.test(sql)) return database.prepare(sql);
    if (!/^\s*(UPDATE|DELETE)\b/i.test(sql) || !/\bWHERE\b/i.test(sql) || /\bRETURNING\b/i.test(sql))
      throw new Error("Unsupported write in shared response settlement; refusing unguarded mutation.");
    // The legacy single-card resolver claims its decision once. Recovery of an
    // expired shared lease legitimately starts with phase already resolving.
    if (/^UPDATE rooms SET phase = 'resolving' WHERE id = \? AND phase = '(response|dying)' AND pending_json = \?$/.test(sql))
      sql = sql.replace(/AND phase = '(response|dying)'/, "AND phase IN ('response', 'dying', 'resolving')");
    let depth = 0, quoted = false, where = -1;
    for (let i = 0; i < sql.length; i++) {
      if (sql[i] === "'") {
        if (quoted && sql[i + 1] === "'") { i++; continue; }
        quoted = !quoted; continue;
      }
      if (quoted) continue;
      if (sql[i] === "(") depth++;
      else if (sql[i] === ")") depth--;
      else if (depth === 0 && /^WHERE\b/i.test(sql.slice(i)) && (i === 0 || /\s/.test(sql[i - 1]))) { where = i; break; }
    }
    if (where < 0) throw new Error("Shared response write has no guarded top-level condition.");
    const guardedSql = `${sql.slice(0, where)} WHERE (${sql.slice(where + 5).replace(/;\s*$/, "")}) AND ${guard}`;
    const wrap = (args: unknown[]): D1PreparedStatement => {
      const statement = database.prepare(guardedSql).bind(...args, ...parameters());
      return new Proxy(statement, { get(target, name) {
        if (name === "bind") return (...values: unknown[]) => wrap(values);
        if (name === "run") return async () => (await database.batch([marker(), statement]))[1];
        const value = Reflect.get(target, name);
        return typeof value === "function" ? value.bind(target) : value;
      } });
    };
    return wrap([]);
  };
  return new Proxy(database, { get(target, name) {
    if (name === "prepare") return prepare;
    if (name === "batch") return async (statements: D1PreparedStatement[]) => (await database.batch([marker(), ...statements])).slice(1);
    const value = Reflect.get(target, name);
    return typeof value === "function" ? value.bind(target) : value;
  } });
}
