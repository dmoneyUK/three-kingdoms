import {expect,test} from '@playwright/test';
import {readFileSync} from 'node:fs';
const API='http://127.0.0.1:3137';
const card=(kind,id)=>({kind,id,suit:'♠',rank:'7'});

test('§10.51 committed AOE Attack survives injected render failure and retries with GET only',async({page,request},testInfo)=>{
  test.setTimeout(90_000);
  const seeded=await request.post(`${API}/__test/seed-playing-game`,{data:{phase:'play',turnSeat:3,players:[
    {name:'Responder',hero:'sun-quan',role:'Lord',hp:4,maxHp:4,hand:[card('Attack','recovery-attack')]},
    {name:'Next',hero:'zhao-yun',role:'Loyalist',hp:4,maxHp:4,hand:[]},
    {name:'Third',hero:'simayi',role:'Rebel',hp:3,maxHp:3,hand:[]},
    {name:'Source',hero:'liu-bei',role:'Renegade',hp:4,maxHp:4,hand:[card('BarbarianInvasion','recovery-invasion')]},
  ]}});
  expect(seeded.ok(),await seeded.text()).toBeTruthy();
  const room=await seeded.json();const viewer=room.players[0],source=room.players[3];
  await page.setViewportSize({width:440,height:894});
  await page.addInitScript(({code,token})=>localStorage.setItem('three-realms-session',JSON.stringify({code,token})),{code:room.code,token:viewer.token});
  await page.goto(`${API}/`);await expect(page.locator('.game-shell')).toBeVisible();
  const played=await request.post(`${API}/api/rooms`,{data:{action:'play_card',code:room.code,token:source.token,cardId:'recovery-invasion'}});
  expect(played.ok(),await played.text()).toBeTruthy();
  for(const member of room.players){
    const current=await (await request.get(`${API}/api/rooms?code=${room.code}&token=${member.token}`)).json();
    if(!current.currentAction.negationWindowId)break;
    const passed=await request.post(`${API}/api/rooms`,{data:{action:'decline_response',code:room.code,token:member.token,context:{windowId:current.currentAction.negationWindowId}}});
    expect(passed.ok(),await passed.text()).toBeTruthy();
  }
  await expect(page.locator(".local-player-dock .console-guidance")).toContainText(/Attack/);
  await page.locator('[data-hand-card-id="recovery-attack"] .game-card').click();
  const confirm=page.locator('.local-player-dock [data-console-surface="local-operation"] button.primary');
  await expect(confirm).toBeEnabled();
  let attackPosts=0;page.on('request',req=>{if(req.method()==='POST'&&req.url().endsWith('/api/rooms')){const body=req.postDataJSON();if(['respond','play_card'].includes(body.action)&&body.cardId==='recovery-attack')attackPosts++;}});
  const responsePromise=page.waitForResponse(res=>res.request().method()==='POST'&&res.request().postDataJSON()?.cardId==='recovery-attack');
  await confirm.click();const response=await responsePromise;
  expect(response.ok()).toBeTruthy();const committed=await response.json();
  expect(committed.room.timeline.some(event=>event.card?.id==='recovery-attack'&&event.action==='play')).toBe(true);
  expect(committed.room.presentationSnapshot.interaction.stage).toBe('NEGATION');
  expect(committed.room.pendingNegation.effectTargetId).toBe(room.players[1].id);
  // Controlled error-boundary injection, not a claim to reproduce the unknown owner exception.
  await page.evaluate(()=>{
    const element=document.querySelector('.game-shell');let fiber=element[Object.keys(element).find(key=>key.startsWith('__reactFiber$'))];
    while(fiber){const instance=fiber.stateNode;if(instance&&typeof instance.recover==='function'&&typeof instance.componentDidCatch==='function'){
      instance.componentDidCatch(new TypeError('controlled test render failure'),{componentStack:'\n at GameRoom (fixture source)'});return;
    }fiber=fiber.return;}throw new Error('No actual GameRoom error boundary found');
  });
  await expect(page.getByRole('button',{name:'Retry game screen',exact:true})).toBeVisible();
  const originalSession=await page.evaluate(()=>localStorage.getItem('three-realms-session'));
  expect(originalSession).toContain(viewer.token);
  const refreshed=page.waitForResponse(res=>res.request().method()==='GET'&&res.url().includes('/api/rooms?')&&res.ok());
  await page.getByRole('button',{name:'Retry game screen',exact:true}).click();await refreshed;
  await expect(page.locator('.game-shell')).toBeVisible();
  expect(await page.evaluate(()=>localStorage.getItem('three-realms-session'))).toBe(originalSession);
  expect(attackPosts).toBe(1);
  // Use the actual trace export from the error surface on a repeated controlled failure.
  await page.evaluate(()=>{
    const element=document.querySelector('.game-shell');let fiber=element[Object.keys(element).find(key=>key.startsWith('__reactFiber$'))];
    while(fiber){if(typeof fiber.stateNode?.componentDidCatch==='function'){fiber.stateNode.componentDidCatch(new Error('fixture repeated'),{componentStack:'\n at GameRoom (fixture)'});return;}fiber=fiber.return;}
  });
  const download=page.waitForEvent('download');await page.getByRole('button',{name:/Download.*trace/i}).click();
  const file=await download;const path=testInfo.outputPath('recovery-trace.json');await file.saveAs(path);
  const trace=JSON.parse(readFileSync(path,'utf8'));
  expect(trace.lifecycleEntries.some(entry=>entry.stage==='game-room-render-failure')).toBe(true);
  expect(trace.lifecycleEntries.some(entry=>entry.stage==='game-screen-retry')).toBe(true);
  expect(trace.lifecycleEntries.some(entry=>entry.stage==='game-session-retired'||entry.stage==='game-user-left')).toBe(false);
  expect(trace.finalRoomState.status).toBe('playing');
  expect(JSON.stringify(trace)).not.toContain(viewer.token);
  await page.getByRole('button',{name:'Leave game',exact:true}).click();
  expect(await page.evaluate(()=>localStorage.getItem('three-realms-session'))).toBeNull();
});
