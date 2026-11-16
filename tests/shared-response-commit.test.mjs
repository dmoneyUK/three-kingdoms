import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { sharedResponseDatabase, withSharedResponseCommit } from '../app/api/shared-response-commit.ts';

function fixture() {
  const sql = new DatabaseSync(':memory:');
  sql.exec(`CREATE TABLE rooms(id TEXT PRIMARY KEY, phase TEXT, pending_json TEXT, shared_response_commit_id TEXT);
    CREATE TABLE players(id TEXT PRIMARY KEY, hp INTEGER CHECK(hp >= 0));
    INSERT INTO players VALUES ('payer', 4);`);
  const pending = JSON.stringify({kind:'shared_response_window', settlement:{claimId:'c',leaseUntil:Date.now()+30000}});
  sql.prepare('INSERT INTO rooms VALUES (?, ?, ?, NULL)').run('r','resolving',pending);
  const statement = (query, args = []) => ({
    bind: (...values) => statement(query,values),
    run: async () => ({ meta:{changes:sql.prepare(query).run(...args).changes} }),
    first: async () => sql.prepare(query).get(...args),
    execute: () => ({meta:{changes:sql.prepare(query).run(...args).changes}}),
  });
  const database = { prepare: statement, batch: async (statements) => {
    sql.exec('BEGIN');
    try { const results = statements.map(s=>s.execute()); sql.exec('COMMIT'); return results; }
    catch(error) {sql.exec('ROLLBACK'); throw error;}
  }};
  return {sql,database,claim:{roomId:'r',expectedPending:pending,claimId:'c'}};
}

test('shared commit guard preserves atomic costs and permits original continuation only after its own commit', async()=>{
  const {sql,database,claim}=fixture();
  assert.equal(sharedResponseDatabase(database),database);
  await withSharedResponseCommit(claim,async()=>{
    const db=sharedResponseDatabase(database);
    await db.batch([db.prepare("UPDATE players SET hp=hp-1 WHERE id=?").bind('payer'),
      db.prepare("UPDATE rooms SET phase='trigger', pending_json=? WHERE id=?").bind('{"kind":"trigger"}','r')]);
    assert.equal(sql.prepare('SELECT hp FROM players').get().hp,3);
    await db.prepare("UPDATE rooms SET phase='play', pending_json=NULL WHERE id=?").bind('r').run();
    assert.equal(sql.prepare('SELECT phase FROM rooms').get().phase,'play');
    // A new shared round revokes old continuation authority, even with the same old durable marker.
    sql.prepare('UPDATE rooms SET pending_json=?').run('{"kind":"shared_response_window","settlement":{"claimId":"new"}}');
    const stale=await db.prepare('UPDATE players SET hp=0 WHERE id=? OR id=?').bind('payer','other').run();
    assert.equal(stale.meta.changes,0);
    assert.equal(sql.prepare('SELECT hp FROM players').get().hp,3);
  });
});

test('expired/replaced leases cannot mutate physical costs or checkpoint, and failed batches roll back all changes',async()=>{
  for (const expired of [true,false]) {
    const {sql,database,claim}=fixture();
    sql.prepare('UPDATE rooms SET pending_json=?').run(JSON.stringify({kind:'shared_response_window',settlement:{claimId:expired?'c':'other',leaseUntil:expired?0:Date.now()+30000}}));
    await withSharedResponseCommit(claim,async()=>{
      const db=sharedResponseDatabase(database);
      const result=await db.prepare('UPDATE players SET hp=hp-1 WHERE id=?').bind('payer').run();
      assert.equal(result.meta.changes,0);
      assert.equal(sql.prepare('SELECT shared_response_commit_id FROM rooms').get().shared_response_commit_id,null);
    });
  }
  const {sql,database,claim}=fixture();
  await withSharedResponseCommit(claim,async()=>{
    const db=sharedResponseDatabase(database);
    await assert.rejects(db.batch([db.prepare('UPDATE players SET hp=3 WHERE id=?').bind('payer'),
      db.prepare('UPDATE players SET hp=-1 WHERE id=?').bind('payer')]));
    assert.equal(sql.prepare('SELECT hp FROM players').get().hp,4);
    assert.equal(sql.prepare('SELECT shared_response_commit_id FROM rooms').get().shared_response_commit_id,null);
    assert.throws(()=>db.prepare('INSERT INTO players VALUES (?,?)'),/Unsupported write/);
  });
});
