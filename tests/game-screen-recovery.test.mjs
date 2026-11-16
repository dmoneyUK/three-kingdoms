import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import TestRenderer, {act} from 'react-test-renderer';
import {GameRoomErrorBoundary} from '../app/page.tsx';
import {gameRenderFailureDiagnostic,resyncStaleResponseTimer} from '../game/game-screen-recovery.ts';

test('render diagnostic strips exception/private identifiers and bounds component names',()=>{
  const room={status:'playing',phase:'response',meId:'private-viewer',actionRevision:'secret-token',players:[{id:'private-viewer',seat:2}],currentAction:{kind:'response',requirement:'attack',providerId:'secret-provider'}};
  const diagnostic=gameRenderFailureDiagnostic(new TypeError('secret-hand-id secret-token'), '\n at CardPoolPanel (https://secret-url/secret-token:1)\n at GameRoom (secret-path:1)',room,'build');
  assert.deepEqual(diagnostic.components,['CardPoolPanel','GameRoom']);
  assert.equal(diagnostic.viewerSeat,2);
  assert.equal(diagnostic.currentActionKind,'response');
  assert.doesNotMatch(JSON.stringify(diagnostic),/secret|private-viewer/);
  assert.equal(gameRenderFailureDiagnostic(new TypeError("Cannot read properties of undefined (reading 'map')"),' at fn (secret-url)',room,'build').property,'map');
});

test('actual error boundary retries one GET without retiring session or replaying a POST; explicit Leave alone clears it',async()=>{
  globalThis.IS_REACT_ACT_ENVIRONMENT=true;
  const saved=JSON.stringify({code:'SAFE1',token:'private'});
  const storage=new Map([['three-realms-session',saved]]);
  const oldWindow=globalThis.window,oldConsole=console.error;
  globalThis.window={addEventListener(){},removeEventListener(){}};
  globalThis.localStorage={getItem:key=>storage.get(key),removeItem:key=>storage.delete(key)};
  console.error=()=>{};
  let fail=true,gets=0,posts=0,refreshSucceeds=true;
  function Child(){if(fail) throw new TypeError('injected fixture failure');return React.createElement('p',null,'Authoritative game');}
  const props={room:{players:[],phase:'response',status:'playing',currentAction:{kind:'response'}},
    onRecover:async()=>{gets++;if(!refreshSucceeds)return false;fail=false;return true;},
    onLeave:()=>storage.delete('three-realms-session')};
  let renderer;
  try {
    await act(async()=>{renderer=TestRenderer.create(React.createElement(GameRoomErrorBoundary,props,React.createElement(Child)));});
    assert.match(JSON.stringify(renderer.toJSON()),/Download.*trace|Download.*Trace/i);
    await act(async()=>{await renderer.root.findByType(GameRoomErrorBoundary).instance.recover();});
    assert.match(JSON.stringify(renderer.toJSON()),/Authoritative game/);
    assert.equal(gets,1);assert.equal(posts,0);assert.equal(storage.get('three-realms-session'),saved);
    fail=true;refreshSucceeds=false;
    await act(async()=>{renderer.update(React.createElement(GameRoomErrorBoundary,props,React.createElement(Child)));});
    await act(async()=>{await renderer.root.findByType(GameRoomErrorBoundary).instance.recover();});
    assert.match(JSON.stringify(renderer.toJSON()),/Retry game screen/);
    assert.equal(storage.get('three-realms-session'),saved);
    await act(async()=>{renderer.root.findAllByType('button').find(button=>button.props.children==='Leave game').props.onClick();});
    assert.equal(storage.has('three-realms-session'),false);
  }finally{if(renderer)await act(async()=>renderer.unmount());console.error=oldConsole;globalThis.window=oldWindow;delete globalThis.localStorage;}
});

test('only stale timer-arm 409 resyncs once, and never replays a mutation',async()=>{
  let gets=0;
  const refresh=async()=>{gets++;return {status:200,currentAction:{kind:'response'}};};
  assert.equal(await resyncStaleResponseTimer('start_response_timer',409,true,refresh),true);
  assert.equal(gets,1);
  for(const action of ['play_card','respond','advance_timers'])assert.equal(await resyncStaleResponseTimer(action,409,true,refresh),false);
  assert.equal(await resyncStaleResponseTimer('start_response_timer',503,false,refresh),false);
  assert.equal(gets,1);
});
