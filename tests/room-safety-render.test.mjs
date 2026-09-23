import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { GameRoom, HeroInfoDialog, HeroSelection, MandatoryChoiceDialog, WaitingRoom } from "../app/page.tsx";
import { STANDARD_HEROES } from "../game/heroes.ts";
import { normalizeRoomData } from "../game/room-safety.js";

const card = (id, kind = "Attack") => ({ id, kind, suit: "♠", rank: "A" });
const gameRoomSource = readFileSync(new URL("../app/page.tsx", import.meta.url), "utf8");
const globalStyleSource = readFileSync(new URL("../app/globals.css", import.meta.url), "utf8");
const sequenceStyleSource = readFileSync(new URL("../app/sequence-overrides.css", import.meta.url), "utf8");

test("waiting room starts without lobby readiness controls", () => {
  const room = normalizeRoomData({
    code: "WAIT1", status: "lobby", maxPlayers: 4, isHost: true, meId: "p1", players: [
      { id: "p1", name: "HOST", seat: 0, isHost: true, ready: false },
      { id: "p2", name: "ALICE", seat: 1, isHost: false, ready: false },
      { id: "p3", name: "BOB", seat: 2, isHost: false, ready: false },
      { id: "p4", name: "CAROL", seat: 3, isHost: false, ready: false },
    ],
  });
  const html = renderToStaticMarkup(React.createElement(WaitingRoom, { room, busy: false, error: "", onStart: () => {}, onAddTestPlayers: () => {}, onLeave: () => {} }));
  assert.match(html, />Start game<\/button>/);
  assert.doesNotMatch(html, />Ready<\/button>/);
  assert.doesNotMatch(html, /NOT READY|ready<\/span>|everybody is ready/i);
  assert.doesNotMatch(gameRoomSource, /set_ready/);
});

test("hero selection shows the effective viewer's private role", () => {
  const room = {
    code: "ROLE1", isTestController: true, meId: "p2", myRole: "Rebel", myHeroOptions: STANDARD_HEROES.slice(0, 3),
    players: [{ id: "p1", name: "PLAYER 1", hero: null, generalReady: false }, { id: "p2", name: "PLAYER 2", hero: null, generalReady: false }],
    isMyAction: true, actionPlayerId: "p2",
  };
  const html = renderToStaticMarkup(React.createElement(HeroSelection, { room, busy: false, error: "", onChoose: () => {}, onLeave: () => {} }));
  assert.match(html, /YOUR SECRET ROLE/);
  assert.match(html, />Rebel<\/strong>/);
  assert.match(html, /aria-label="Your secret role is Rebel"/);
  assert.equal((html.match(/class="hero-choice-wrap/g) ?? []).length, 3, "each private candidate has a card wrapper");
  assert.equal((html.match(/class="hero-info-button"/g) ?? []).length, 3, "each private candidate has an information control");
  assert.match(html, /aria-label="View Cao Cao information"/);
  assert.match(html, /data-hero-art-id="cao-cao"/);
  assert.match(html, /data-hero-art-id="simayi"/);
  assert.match(html, /data-hero-art-id="xiahou-dun"/);
  for (const asset of ["hero-cao-cao.jpg", "hero-liu-bei.jpg", "hero-sun-quan.jpg", "hero-sima-yi.jpg", "hero-xiahou-dun.jpg", "hero-zhang-liao.jpg"]) {
    assert.ok(existsSync(new URL(`../public/${asset}`, import.meta.url)), `${asset} is checked in`);
  }
  assert.match(gameRoomSource, /const \[infoHero, setInfoHero\] = useState<Hero \| null>\(null\)/);
  assert.match(gameRoomSource, /className=\{`hero-choice-wrap \$\{effectiveSelected === hero\.id \? "selected" : ""\}`\}/);
  assert.match(gameRoomSource, /onClick=\{\(\) => setInfoHero\(hero\)\}/);
  assert.match(gameRoomSource, /\{infoHero && <HeroInfoDialog hero=\{infoHero\}/);
  const artHeroes = ["cao-cao", "liu-bei", "sun-quan", "simayi", "xiahou-dun"].map((id) => STANDARD_HEROES.find((hero) => hero.id === id));
  assert.ok(artHeroes.every(Boolean));
  const zhangLiao = STANDARD_HEROES.find((hero) => hero.id === "zhang-liao");
  const zhouYu = STANDARD_HEROES.find((hero) => hero.id === "zhou-yu");
  assert.ok(zhangLiao && zhouYu);
  const zhangLiaoHtml = renderToStaticMarkup(React.createElement(HeroSelection, { room: { ...room, myHeroOptions: [zhangLiao] }, busy: false, error: "", onChoose: () => {}, onLeave: () => {} }));
  const zhouYuHtml = renderToStaticMarkup(React.createElement(HeroSelection, { room: { ...room, myHeroOptions: [zhouYu] }, busy: false, error: "", onChoose: () => {}, onLeave: () => {} }));
  assert.match(gameRoomSource, /"zhang-liao": "\/hero-zhang-liao\.jpg"/);
  assert.match(zhangLiaoHtml, /data-hero-art-id="zhang-liao"/);
  assert.match(zhouYuHtml, /class="hero-art-fallback" data-hero-art-id="zhou-yu"[^>]*>ZY<\/span>/, "heroes without checked-in artwork keep the initials fallback");
  const lordHtml = renderToStaticMarkup(React.createElement(HeroSelection, { room: { ...room, myRole: "Lord", myHeroOptions: artHeroes }, busy: false, error: "", onChoose: () => {}, onLeave: () => {} }));
  assert.match(lordHtml, /class="hero-choice-grid hero-choice-grid-5"/);
  assert.equal((lordHtml.match(/class="hero-choice-wrap/g) ?? []).length, 5, "Lord receives five portrait candidate cards");
  for (const id of ["cao-cao", "liu-bei", "sun-quan", "simayi", "xiahou-dun"]) assert.match(lordHtml, new RegExp(`data-hero-art-id="${id}"`));
  assert.match(globalStyleSource, /\.hero-monogram > \.hero-art-image\s*\{[^}]*position: absolute;[^}]*inset: 0;/, "selection artwork fills the portrait container");
  assert.match(globalStyleSource, /@media \(max-width: 520px\)[\s\S]*?\.hero-choice-grid,[\s\S]*?grid-template-columns: repeat\(6, minmax\(0, 1fr\)\)/, "mobile hero selection keeps three card tracks");
  assert.match(globalStyleSource, /\.hero-choice-grid-5 > \.hero-choice-wrap:nth-child\(4\)\s*\{\s*grid-column: 2 \/ span 2;/, "Lord's fourth card starts the centred second row");
  assert.match(globalStyleSource, /\.hero-choice-grid-5 > \.hero-choice-wrap:nth-child\(5\)\s*\{\s*grid-column: 4 \/ span 2;/, "Lord's fifth card completes the centred second row");
  assert.match(globalStyleSource, /@media \(max-width: 900px\)[\s\S]*?\.hero-choice-wrap\s*\{\s*grid-column: span 2;\s*aspect-ratio: 2 \/ 3;\s*min-height: clamp\(184px, 48\.5vw, 210px\)/, "tablet hero cards use a compact portrait proportion with content-safe height");
  assert.match(globalStyleSource, /@media \(max-width: 900px\)[\s\S]*?\.hero-choice\s*\{\s*display: grid;\s*grid-template-rows: minmax\(clamp\(108px, 29vw, 124px\), 1fr\) auto auto auto;\s*align-content: start;\s*align-items: stretch;/, "hero card layout gives the portrait a growing track before compact metadata");
  assert.match(globalStyleSource, /\.hero-choice-grid,[\s\S]*?width: min\(100%, 392px\)/, "mobile hero grid uses the available viewport width");
  assert.match(globalStyleSource, /@media \(max-width: 520px\)[\s\S]*?\.hero-choice-wrap\s*\{\s*aspect-ratio: 2 \/ 3;/, "mobile hero cards use the normal portrait proportion");
  assert.match(globalStyleSource, /@media \(max-width: 520px\)[\s\S]*?\.hero-monogram\s*\{\s*flex: none;\s*height: auto;\s*margin: 14px 0 3px;/, "mobile hero artwork participates in the content-first card layout");
  assert.match(globalStyleSource, /@media \(max-width: 520px\)[\s\S]*?\.hero-confirm\s*\{\s*width: min\(100%, 392px\);\s*max-width: none;/, "mobile confirmation aligns with the hero grid");
  assert.match(globalStyleSource, /@media \(max-width: 900px\)[\s\S]*?\.hero-confirm\s*\{\s*width: min\(100%, 440px\);\s*max-width: none;/, "tablet confirmation aligns with the tablet hero grid");
  assert.doesNotMatch(globalStyleSource, /@media \(max-width: 520px\)[\s\S]*?\.hero-monogram\s*\{[^}]*height: 54px;/, "mobile hero artwork has no 54px bottleneck");
  assert.match(globalStyleSource, /\.hero-choice \.hero-monogram > \.hero-art-image\s*\{[^}]*object-fit: cover;[^}]*object-position: center top;/, "selection artwork uses selection-scoped cover framing");
  assert.doesNotMatch(globalStyleSource, /\.hero-choice \.hero-monogram > \.hero-art-image\s*\{[^}]*object-fit: contain;/, "selection artwork does not retain the side-bar framing");
  assert.doesNotMatch(globalStyleSource, /\.hero-choice i\s*\{[^}]*margin-top: auto;/, "selection state follows skills without an empty flex tail");
  assert.match(globalStyleSource, /\.hero-shell\s*\{\s*min-height: 100dvh;/, "selection page uses the dynamic mobile viewport height");
  assert.match(lordHtml, /class="hero-choice [^"]*"[\s\S]*?<\/button><button type="button" class="hero-info-button"/, "information controls remain sibling buttons rather than nested controls");
  assert.doesNotMatch(globalStyleSource, /\.hero-choice-grid\s*\{\s*grid-template-columns: repeat\(2/, "mobile hero selection does not regress to two flexible columns");
});

test("the local player dock replaces the self battlefield square and follows Quick Test perspective", () => {
  const players = [
    { id: "p1", name: "HOST", seat: 0, hero: "cao-cao", hp: 4, maxHp: 4, alive: true, connected: true, handCount: 2, equipmentCards: [card("weapon", "BlueSteelSword"), card("armor", "NioShield"), card("offensive-horse", "RedHare"), card("defensive-horse", "Shadowrunner")], judgementCards: [card("lightning", "Lightning"), card("overindulgence", "Overindulgence")], attackRange: 2, distance: null, isHost: true, role: "Lord" },
    { id: "p2", name: "ALICE", seat: 1, hero: "liu-bei", hp: 3, maxHp: 4, alive: true, connected: true, handCount: 4, equipmentCards: [card("opponent-weapon", "BlueSteelSword")], judgementCards: [], attackRange: 1, distance: 1, isHost: false, role: "Rebel" },
    { id: "p3", name: "BOB", seat: 2, hero: "zhang-fei", hp: 3, maxHp: 4, alive: true, connected: true, handCount: 4, equipmentCards: [], judgementCards: [card("opponent-judgement", "Lightning")], attackRange: 1, distance: 1, isHost: false, role: "Loyalist" },
    { id: "p4", name: "CAROL", seat: 3, hero: "xiahou-dun", hp: 3, maxHp: 4, alive: true, connected: true, handCount: 4, equipmentCards: [], judgementCards: [], attackRange: 1, distance: 1, isHost: false, role: "Spy" },
  ];
  const payload = {
    code: "DOCK1", status: "playing", maxPlayers: 4, isHost: true, isTestController: true, meId: "p1", myRole: "Lord", myHeroOptions: [], players,
    myHand: [card("private-hand", "Peach"), card("private-attack", "Attack"), card("private-dodge", "Dodge"), card("private-dismantle", "Dismantle")], turnSeat: 0, phase: "play", deckCount: 40, discardTop: card("visible-discard", "Dismantle"), log: [], timeline: [], isMyTurn: true, actionPlayerId: "p1", actionReason: "Play cards", isMyAction: true,
    currentAction: { version: 3, kind: "turn", actorId: "p1", deadline: 0, reason: "Play cards", legalActions: ["play_card"], canDeclareAttack: true, playPhaseActions: [] },
  };
  const room = normalizeRoomData(payload);
  assert.ok(room);
  const html = renderToStaticMarkup(React.createElement(GameRoom, { room, busy: false, error: "", onAction: async () => true, onLeave: () => {} }));
  assert.equal((html.match(/class="player-square /g) ?? []).length, 3, "a four-player board renders only the three opponents");
  assert.equal((html.match(/data-player-anchor="/g) ?? []).length, 4, "every visible player has one authoritative DOM anchor");
  assert.match(html, /class="local-player-dock"[^>]*data-player-anchor="p1"/);
  assert.match(html, /class="player-square[^>]*data-player-anchor="p2"/);
  assert.match(html, /class="player-square[^>]*data-player-anchor="p3"/);
  assert.match(html, /class="mini-zone-card mini-equipment-card"[^>]*data-equipment-id="opponent-weapon"/);
  assert.match(html, /class="player-hp">HP 3\/4<\/span>[\s\S]*class="player-hearts">♥♥♥<\/span>[\s\S]*class="player-hand-count">Hand cards: 4<\/small>/);
  assert.match(html, /class="mini-zone-card mini-equipment-card"[^>]*data-equipment-id="opponent-weapon"[\s\S]*class="played-card bluesteelsword black-suit/);
  assert.match(html, /class="mini-zone-card judgement-mini"[^>]*data-judgement-id="opponent-judgement"/);
  assert.match(html, /class="local-hand"[^>]*data-card-origin-anchor="p1"/);
  assert.match(html, /class="draw-stack"[^>]*data-draw-anchor="true"/);
  assert.match(html, /class="discard-stack"[^>]*data-discard-anchor="true"/);
  assert.doesNotMatch(html, /class="player-square player-square-0/);
  assert.match(html, /class="local-player-dock"/);
  assert.match(html, /data-hero-id="cao-cao"/);
  assert.match(html, /class="player-square-portrait" data-hero-id="liu-bei"[\s\S]*data-hero-art-id="liu-bei"/);
  assert.match(html, /data-hero-art-id="xiahou-dun"/);
  assert.match(html, /class="local-status-panel"[\s\S]*class="local-status-hp">HP 4\/4<\/span>[\s\S]*class="local-status-hearts">♥♥♥♥<\/span>[\s\S]*class="local-status-role">Lord<\/strong>/);
  assert.equal((html.match(/class="hero-skill-button/g) ?? []).length, 2, "Cao Cao exposes one button per metadata skill");
  assert.match(html, />Treachery<\/button>[\s\S]*>Entourage<\/button>/);
  assert.doesNotMatch(html, />Skill<\/button>/, "known hero skills never fall back to a generic label");
  assert.doesNotMatch(html, /local-dock-meta/);
  assert.equal((html.match(/class="local-equipment-slot"/g) ?? []).length, 4);
  assert.match(html, /data-slot="defensiveHorse"[^>]*aria-label="\+1 Horse slot"/);
  assert.match(html, /data-slot="offensiveHorse"[^>]*aria-label="-1 Horse slot"/);
  assert.equal((html.match(/class="local-dock-zones"/g) ?? []).length, 1);
  assert.equal((html.match(/class="local-equipment-panel"/g) ?? []).length, 1);
  assert.equal((html.match(/class="local-judgement-panel"/g) ?? []).length, 1);
  assert.doesNotMatch(html, /class="local-zone-panel"/);
  const emptyRoom = normalizeRoomData({ ...payload, code: "DOCK-EMPTY", players: players.map((player) => player.id === "p1" ? { ...player, equipmentCards: [], judgementCards: [] } : player) });
  assert.ok(emptyRoom);
  const emptyHtml = renderToStaticMarkup(React.createElement(GameRoom, { room: emptyRoom, busy: false, error: "", onAction: async () => true, onLeave: () => {} }));
  assert.equal((emptyHtml.match(/class="local-zone-empty-label"/g) ?? []).length, 4, "empty equipment slots retain all four labels");
  assert.doesNotMatch(emptyHtml, />\+<\/span>/, "empty equipment slots do not render a plus placeholder");
  const equipmentOrder = ["weapon", "armor", "defensiveHorse", "offensiveHorse"].map((slot) => html.indexOf(`data-slot="${slot}"`));
  assert.deepEqual(equipmentOrder, [...equipmentOrder].sort((a, b) => a - b), "equipment uses Weapon, Armour, +1 Horse, -1 Horse order");
  assert.match(sequenceStyleSource, /\.local-dock-zones\s*\{[\s\S]*align-items: stretch/);
  assert.equal((html.match(/class="local-status-panel"/g) ?? []).length, 1);
  assert.match(html, /data-slot="weapon"[^>]*aria-label="Weapon slot"/);
  assert.match(html, /data-slot="armor"[^>]*aria-label="Armour slot"/);
  assert.match(html, /class="local-judgement-cards"[^>]*data-judgement-layout="pending"/);
  assert.equal((html.match(/class="local-judgement-card-slot"/g) ?? []).length, 2, "Judgement renders only its two actual cards");
  assert.match(gameRoomSource, /const judgementCardLayout = useMemo[\s\S]*Math\.max\(12, naturalStep\)/, "Judgement spacing overlaps dynamically");
  assert.doesNotMatch(sequenceStyleSource, /local-judgement-stack \.local-zone-card:nth-child/);
  assert.match(html, /aria-label="Explain Blue Steel Sword"/); assert.match(html, /aria-label="Explain Lightning"/);
  assert.match(html, /data-equipment-id="weapon"[\s\S]*class="played-card bluesteelsword black-suit/);
  assert.match(html, /data-judgement-id="lightning"[\s\S]*class="played-card lightning black-suit/);
  assert.match(gameRoomSource, /const renderZoneCard[\s\S]*<CardFace card=\{card\}/, "local zones reuse the shared card artwork renderer");
  assert.match(html, /class="local-hand"/); assert.match(html, /class="local-hand-rail"/);
  assert.equal((html.match(/class="local-hand-section"/g) ?? []).length, 1, "the hand is a distinct dock layout region");
  assert.equal((html.match(/class="turn-controls"/g) ?? []).length, 1, "the action row is a distinct dock layout region");
  assert.doesNotMatch(html, /local-dock-content|local-dock-actions/, "hand and actions are not hidden inside a generic content wrapper");
  const railStart = html.indexOf('class="local-hand-rail"');
  assert.ok(railStart >= 0, "the local hand has a bounded rail presentation");
  assert.equal((html.match(/class="card-slot/g) ?? []).length, 4, "the rail has one slot per physical hand card");
  assert.equal((html.match(/data-hand-card-id="/g) ?? []).length, 4, "the compact rail keeps exactly four physical hand cards");
  assert.equal((html.match(/class="hand-card-visual"/g) ?? []).length, 4, "each physical hand card owns one shared visual wrapper");
  assert.equal((html.match(/class="card-info-button"/g) ?? []).length, 4, "each physical hand card owns one information control");
  assert.doesNotMatch(html, /class="play-hand"/, "the legacy private play-hand renderer is removed");
  assert.match(html, /class="local-hand"[\s\S]*class="local-hand-rail"/);
  assert.ok(html.indexOf('class="local-hand"') < html.indexOf('class="turn-controls"'), "the hand precedes contextual controls in the DOM");
  assert.match(gameRoomSource, /const multiSelectMode = room\.phase === "discard"/);
  assert.match(gameRoomSource, /const singleSelected = !multiSelectMode && isSelected/);
  assert.match(gameRoomSource, /singleSelected \? "single-selected"/);
  assert.match(gameRoomSource, /data-hand-card-id=\{item\.id\}[\s\S]*className="card-info-button"/);
  assert.doesNotMatch(gameRoomSource, /local-selected-card-preview|selectedPreviewCard/);
  assert.match(gameRoomSource, /key={`rail-\$\{item\.id\}`}/);
  assert.match(html, /class="discard-stack"[^>]*data-discard-kind="Dismantle"/);
  assert.match(html, /title="After you take damage, you may obtain the card that caused damage on you\."/);
  assert.doesNotMatch(html, /private-opponent-card/);
  const sequenceSource = gameRoomSource.slice(gameRoomSource.indexOf("function TableResolutionSequence"), gameRoomSource.indexOf("function CardFace"));
  assert.doesNotMatch(sequenceSource, /Math\.(sin|cos)|activeAngle|activeRadians|--seat-[xy]/, "resolution placement is not circular seat geometry");
  assert.match(sequenceSource, /centerRelativeToTable/);
  assert.match(sequenceStyleSource, /\.local-dock-identity,\s*\.local-dock-zones,\s*\.local-status-panel,\s*\.local-equipment-panel,\s*\.local-judgement-panel,\s*\.local-hand-section,\s*\.local-player-dock \.turn-controls\s*\{[\s\S]*border: 1px solid #765f3c99[\s\S]*background: #0e120dcc/);
  assert.match(sequenceStyleSource, /--hand-panel-height: 72px[\s\S]*--hand-peek-height: 56px[\s\S]*--hand-card-height: 102px[\s\S]*--hand-top-inset: 4px[\s\S]*--selected-rise: 48px[\s\S]*--hand-bottom-gutter: 10px/);
  assert.match(sequenceStyleSource, /hand-top-inset - selected-rise \+ hand-card-height[\s\S]*hand-panel-height - hand-bottom-gutter/);
  assert.match(sequenceStyleSource, /@media \(max-width: 480px\)[\s\S]*grid-template-columns: 64px minmax\(0, 1fr\)[\s\S]*grid-template-rows: auto var\(--hand-panel-height\) 40px/);
  assert.match(sequenceStyleSource, /--status-panel-width: clamp\(72px, 19vw, 92px\)[\s\S]*--zone-card-width: clamp\(28px, 7\.6vw, 34px\)/);
  assert.match(sequenceStyleSource, /\.local-dock-zones\s*\{[\s\S]*grid-template-columns: var\(--status-panel-width\) max-content calc\(var\(--zone-card-width\) \+ var\(--zone-card-width\) \+ var\(--zone-card-gap\) \+ 8px\)/);
  assert.match(sequenceStyleSource, /\.local-hand-section\s*\{[\s\S]*height: var\(--hand-panel-height\)[\s\S]*padding: var\(--hand-top-inset\) 4px var\(--hand-bottom-gutter\)/);
  assert.match(sequenceStyleSource, /\.local-dock-identity,\s*\.local-dock-zones,\s*\.local-status-panel,\s*\.local-equipment-panel,\s*\.local-judgement-panel,\s*\.local-hand-section,\s*\.local-player-dock \.turn-controls\s*\{[\s\S]*border: 1px solid #765f3c99[\s\S]*background: #0e120dcc/);
  assert.match(sequenceStyleSource, /\.local-hand-rail\s*\{[\s\S]*top: 0[\s\S]*height: var\(--hand-peek-height\)[\s\S]*overflow: visible/);
  assert.match(gameRoomSource, /ResizeObserver[\s\S]*handRailWidth[\s\S]*naturalStep[\s\S]*minStep/);
  assert.doesNotMatch(sequenceStyleSource, /margin-left: -38px|margin-left: -34px/);
  assert.match(html, /class="hand-card-visual"[\s\S]*class="game-card[\s\S]*class="card-info-button"/);
  assert.match(sequenceStyleSource, /\.local-hand-rail \.card-slot\.single-selected \.hand-card-visual\s*\{[\s\S]*transform: translateY\(calc\(-1 \* var\(--selected-rise\)\)\)/);
  assert.match(sequenceStyleSource, /\.local-hand-rail \.card-info-button\s*\{[\s\S]*left: 50%[\s\S]*top: calc\(var\(--hand-card-height\) \* \.67\)/);
  assert.match(sequenceStyleSource, /\.local-hand-rail \.card-slot\.single-selected \.card-info-button\s*\{[\s\S]*opacity: 1[\s\S]*pointer-events: auto[\s\S]*translate: -50% -50%/);
  assert.match(sequenceStyleSource, /\.local-hand-rail \.game-card \.corner\s*\{[\s\S]*width: 17px[\s\S]*min-height: 23px/);
  assert.match(sequenceStyleSource, /\.local-hand-section\s*\{[\s\S]*z-index: 50/);
  assert.match(sequenceStyleSource, /\.local-player-dock \.turn-controls\s*\{[\s\S]*z-index: 100/);
  assert.match(globalStyleSource, /\.player-square\{[\s\S]*aspect-ratio:2 \/ 3[\s\S]*width:100%[\s\S]*@media\(max-width:700px\)[\s\S]*\.player-square\{width:clamp\(92px,26vw,112px\)/);
  assert.doesNotMatch(globalStyleSource, /Final mobile player panels/);
  assert.doesNotMatch(sequenceStyleSource, /margin-left: -38px|margin-left: -34px/);
  assert.match(sequenceStyleSource, /\.local-player-dock \.turn-controls\s*\{[\s\S]*min-height: 54px[\s\S]*padding: 7px 8px/);
  assert.match(sequenceStyleSource, /\.local-player-dock \.turn-controls button\s*\{[\s\S]*min-width: 78px/);
  assert.match(globalStyleSource, /\.player-hp[\s\S]*\.player-hearts[\s\S]*\.player-hand-count/);
  assert.match(globalStyleSource, /\.mini-equipment-card \.mini-equipment-button > \.played-card[\s\S]*width: 100%[\s\S]*height: 100%/);
  assert.match(sequenceStyleSource, /@media \(max-width: 360px\)[\s\S]*grid-template-columns: 58px minmax\(0, 1fr\)/);

  const switched = normalizeRoomData({ ...payload, code: "DOCK2", meId: "p3", myRole: "Loyalist", myHand: [card("switched-hand", "Dodge")], actionPlayerId: "p3", currentAction: { ...payload.currentAction, actorId: "p3" } });
  assert.ok(switched);
  const switchedHtml = renderToStaticMarkup(React.createElement(GameRoom, { room: switched, busy: false, error: "", onAction: async () => true, onLeave: () => {} }));
  assert.equal((switchedHtml.match(/class="player-square /g) ?? []).length, 3, "switching the controlled seat keeps three opponents on the board");
  assert.match(switchedHtml, /data-hero-id="zhang-fei"/);
  assert.match(switchedHtml, /class="local-status-panel"[\s\S]*class="local-status-role">Loyalist<\/strong>/);
  assert.match(switchedHtml, /Dodge/);
});

test("normalized malformed and unknown response states render safely", () => {
  const room = normalizeRoomData({
    code: "SAFE1", status: "playing", maxPlayers: 4, isHost: true, isTestController: false, meId: "p1", myRole: "Lord", myHeroOptions: null,
    players: [{ id: "p1", name: "ME", seat: 0, hero: "simayi", hp: 3, maxHp: 3, alive: true, connected: true, handCount: 1, equipmentCards: null, judgementCards: [null, { ...card("played-heart", "Dodge"), suit: "♥", rank: "2" }, { ...card("played-diamond", "Peach"), suit: "♦", rank: "3" }, { ...card("played-spade", "Dodge"), suit: "♠", rank: "4" }, { ...card("played-club", "Peach"), suit: "♣", rank: "5" }], attackRange: 1, distance: null, isHost: true, role: "Lord" }, null],
    myHand: [card("hand"), { ...card("red-hand"), suit: "♥" }], turnSeat: 0, phase: "play", deckCount: 40, discardTop: null, log: null,
    timeline: [null, { type: "card", card: null }, { type: "message", message: "Safe" }],
    pendingAttack: null, pendingGreenDragon: { kind: "green_dragon", sourceId: "p1" }, pendingRockCleaving: null, pendingFrostSword: null, pendingDuel: null,
    pendingGroup: null, pendingNegation: null, pendingHarvest: { kind: "harvest", revealed: [null, card("revealed")], choices: null }, pendingTargetCard: null, pendingDying: null,
  });
  assert.ok(room);
  const html = renderToStaticMarkup(React.createElement(GameRoom, { room, busy: false, error: "", onAction: async () => true, onLeave: () => {} }));
  assert.match(html, /game-exit/);
  assert.match(html, /class="local-player-dock"/);
  assert.match(html, /aria-label="Explain Sima Yi"/);
  assert.doesNotMatch(html, />Necromancy<\/em>/);
  const heroInfoHtml = renderToStaticMarkup(React.createElement(HeroInfoDialog, { hero: { id: "simayi", name: "Sima Yi", faction: "Wei", hp: 3, skills: [{ name: "Retaliation", description: "After you take damage, you may obtain 1 card from the character that inflicted the damage." }, { name: "Necromancy", description: "After a Judgement card is flipped, you may discard 1 card from your hand. The discarded card then becomes the new Judgement card." }], ability: "After you take damage, you may obtain 1 card from the character that inflicted the damage." }, onClose: () => {} }));
  assert.match(heroInfoHtml, />Retaliation<\/strong>/);
  assert.match(heroInfoHtml, />Necromancy<\/strong>/);
  assert.match(heroInfoHtml, /After a Judgement card is flipped/);
  const ganglieInfoHtml = renderToStaticMarkup(React.createElement(HeroInfoDialog, { hero: { id: "xiahou-dun", name: "Xiahou Dun", faction: "Wei", hp: 4, skill: "Stauchness", ability: "After you take damage, you may enter Judgement phase, if the Judgement card does not belong to [Heart], the source of damage must choose between: ①discard 2 hand cards; ②take 1 damage from you." }, onClose: () => {} }));
  assert.match(ganglieInfoHtml, />Stauchness<\/strong>/);
  assert.match(ganglieInfoHtml, /source of damage must choose between/);
  assert.match(ganglieInfoHtml, /①discard 2 hand cards/);
  const choiceSelection = { type: "choice", choices: [{ id: "discard_two", label: "Discard exactly 2 cards from your hand" }, { id: "take_damage", label: "Take 1 damage from Xiahou Dun" }], eligibleHandKeys: ["hand:0", "hand:1"], cardCountByChoice: { discard_two: 2 } };
  const ganglieHand = [{ ...card("ganglie-dodge", "Dodge"), suit: "♠", rank: "7" }, { ...card("ganglie-peach", "Peach"), suit: "♥", rank: "Q" }];
  const ganglieChoiceHtml = renderToStaticMarkup(React.createElement(MandatoryChoiceDialog, { option: { effectId: "xiahou_dun_ganglie", label: "Stauchness", description: "The Judgement is not a Heart. Choose one: discard exactly 2 cards from your hand, or take 1 damage from Xiahou Dun. Equipment and Judgement Zone cards cannot be discarded for this choice.", allowDecline: false, selection: choiceSelection }, selection: choiceSelection, hand: ganglieHand, selectedChoice: "", selectedKeys: [], disabled: false, error: "", onChoice: () => {}, onToggle: () => {}, onConfirm: () => {} }));
  assert.match(ganglieChoiceHtml, /The Judgement is not a Heart/);
  assert.match(ganglieChoiceHtml, /Discard exactly 2 cards from your hand/);
  assert.match(ganglieChoiceHtml, /Take 1 damage from Xiahou Dun/);
  const ganglieDiscardChoiceHtml = renderToStaticMarkup(React.createElement(MandatoryChoiceDialog, {
    option: { effectId: "xiahou_dun_ganglie", label: "Stauchness", description: "The Judgement is not a Heart. Choose one: discard exactly 2 cards from your hand, or take 1 damage from Xiahou Dun. Equipment and Judgement Zone cards cannot be discarded for this choice.", allowDecline: false, selection: choiceSelection }, selection: choiceSelection, hand: ganglieHand, selectedChoice: "discard_two", selectedKeys: ["hand:0", "hand:1"], disabled: false, error: "",
    onChoice: () => {}, onToggle: () => {}, onConfirm: () => {},
  }));
  assert.match(ganglieDiscardChoiceHtml, /class="played-card dodge black-suit/);
  assert.match(ganglieDiscardChoiceHtml, /class="played-card peach red-suit/);
  assert.match(ganglieDiscardChoiceHtml, />Dodge<\//);
  assert.match(ganglieDiscardChoiceHtml, />Peach<\//);
  assert.match(ganglieDiscardChoiceHtml, /7<small>♠<\/small>/);
  assert.match(ganglieDiscardChoiceHtml, /Q<small>♥<\/small>/);
  assert.match(ganglieDiscardChoiceHtml, /♠/);
  assert.match(ganglieDiscardChoiceHtml, /♥/);
  assert.equal((ganglieDiscardChoiceHtml.match(/class="target-card-picker-card selected/g) ?? []).length, 2, "Stauchness allows exactly the two eligible hand cards to be selected");
  assert.doesNotMatch(ganglieDiscardChoiceHtml, /Hidden hand card|concealed-card|>\?<\/span>/);
  assert.match(html, /Attack/);
  assert.match(html, /class="game-card attack black-suit/);
  assert.match(html, /class="game-card attack red-suit/);
  assert.equal((html.match(/class="local-zone-card red-suit/g) ?? []).length, 2);
  assert.equal((html.match(/class="local-zone-card black-suit/g) ?? []).length, 2);
  assert.doesNotMatch(html, /Cannot read properties of null/);
  const waitingRoom = normalizeRoomData({
    code: "SAFE2", status: "playing", maxPlayers: 4, isHost: true, isTestController: true, meId: "p1", myRole: "Lord", myHeroOptions: [],
    players: [{ id: "p1", name: "ME", seat: 0, hero: "zhang-fei", hp: 3, maxHp: 3, alive: true, connected: true, handCount: 0, equipmentCards: [], judgementCards: [], attackRange: 1, distance: null, isHost: true, role: "Lord" }],
    myHand: [], turnSeat: 0, phase: "response", deckCount: 0, discardTop: null, log: [], timeline: [], isMyTurn: false, actionPlayerId: "p1", actionReason: "Waiting", isMyAction: true,
    pendingAttack: null, pendingGreenDragon: null, pendingRockCleaving: null, pendingFrostSword: null, pendingDuel: null, pendingGroup: null, pendingNegation: null, pendingHarvest: null, pendingTargetCard: null, pendingDying: null,
  });
  assert.ok(waitingRoom);
  const waitingHtml = renderToStaticMarkup(React.createElement(GameRoom, { room: waitingRoom, busy: false, error: "", onAction: async () => true, onLeave: () => {} }));
  assert.match(waitingHtml, /class="discard-empty"/, "an empty discard pile renders safely");
  assert.doesNotMatch(waitingHtml, /Skip · take 1 damage/);
  assert.match(waitingHtml, /Waiting for the latest response state/);

  const longdanPlayRoom = normalizeRoomData({
    code: "SAFE-LONGDAN-PLAY", status: "playing", maxPlayers: 4, isHost: true, isTestController: true, meId: "p1", myRole: "Lord", myHeroOptions: [],
    players: [{ id: "p1", name: "ME", seat: 0, hero: "zhao-yun", hp: 4, maxHp: 4, alive: true, connected: true, handCount: 2, equipmentCards: [card("weapon", "BlueSteelSword")], judgementCards: [], attackRange: 2, distance: null, isHost: true, role: "Lord" }],
    myHand: [card("longdan-dodge", "Dodge"), card("longdan-attack", "Attack")], turnSeat: 0, phase: "play", deckCount: 20, discardTop: null, log: [], timeline: [], isMyTurn: true, actionPlayerId: "p1", actionReason: "Play cards", isMyAction: true,
    currentAction: { version: 3, kind: "turn", actorId: "p1", deadline: 0, reason: "Play cards", legalActions: ["play_card"], canDeclareAttack: true, playPhaseActions: [{ cardId: "longdan-dodge", canPlayAs: "attack" }] },
  });
  const longdanPlayHtml = renderToStaticMarkup(React.createElement(GameRoom, { room: longdanPlayRoom, busy: false, error: "", onAction: async () => true, onLeave: () => {} }));
  assert.match(longdanPlayHtml, />Braveheart<\/button>/);
  assert.match(longdanPlayHtml, /class="game-card dodge black-suit/);

  const longdanResponseRoom = normalizeRoomData({
    code: "SAFE-LONGDAN-RESPONSE", status: "playing", maxPlayers: 4, isHost: true, isTestController: true, meId: "p1", myRole: "Lord", myHeroOptions: [],
    players: [{ id: "p1", name: "ME", seat: 0, hero: "zhao-yun", hp: 4, maxHp: 4, alive: true, connected: true, handCount: 1, equipmentCards: [], judgementCards: [], attackRange: 1, distance: null, isHost: true, role: "Lord" }],
    myHand: [card("longdan-response-attack", "Attack")], turnSeat: null, phase: "response", deckCount: 20, discardTop: null, log: [], timeline: [], isMyTurn: false, actionPlayerId: "p1", actionReason: "Dodge or take damage", isMyAction: true,
    pending: { kind: "response" }, currentAction: { version: 3, kind: "response", actorId: "p1", deadline: 0, reason: "Dodge or take damage", legalActions: ["respond", "decline_response"], requirement: "dodge", options: [{ providerId: "card", satisfies: "dodge", activation: "implicit", label: "Play Dodge", selection: null }, { providerId: "zhao_yun_attack_as_dodge", satisfies: "dodge", activation: "explicit", label: "Use Braveheart as Dodge", playedAs: "dodge", selection: { type: "cards", min: 1, max: 1, eligibleCardIds: ["longdan-response-attack"] } }] },
  });
  const longdanResponseHtml = renderToStaticMarkup(React.createElement(GameRoom, { room: longdanResponseRoom, busy: false, error: "", onAction: async () => true, onLeave: () => {} }));
  assert.match(longdanResponseHtml, />Braveheart<\/button>/);
  assert.doesNotMatch(longdanResponseHtml, /Use Braveheart as Dodge/);

  const luoshenPayload = {
    code: "SAFE-LUOSHEN-BUSY", status: "playing", maxPlayers: 4, isHost: false, isTestController: true, meId: "p1", myRole: "Rebel", myHeroOptions: [],
    players: [{ id: "p1", name: "Zhen Ji", seat: 0, hero: "zhen-ji", hp: 3, maxHp: 3, alive: true, connected: true, handCount: 0, equipmentCards: [], judgementCards: [], attackRange: 1, distance: null, isHost: false, role: "Rebel" }],
    myHand: [], turnSeat: 0, phase: "response", deckCount: 20, discardTop: null, log: [], timeline: [], isMyTurn: false, actionPlayerId: "p1", actionReason: "Choose whether to use Godess of Luo River", isMyAction: true,
    pending: { kind: "trigger" }, currentAction: { version: 3, kind: "trigger", actorId: "p1", deadline: 0, reason: "Choose whether to use Godess of Luo River", legalActions: ["trigger", "decline_trigger"], triggerEvent: "turn_start", triggerOptions: [{ effectId: "zhen_ji_luoshen", label: "Godess of Luo River", selection: null }], declineAction: "decline_trigger" },
    pendingAttack: null, pendingGreenDragon: null, pendingRockCleaving: null, pendingFrostSword: null, pendingDuel: null, pendingGroup: null, pendingNegation: null, pendingHarvest: null, pendingTargetCard: null, pendingBorrowedSword: null, pendingDying: null,
  };
  const luoshenRoom = normalizeRoomData(luoshenPayload);
  const luoshenReadyHtml = renderToStaticMarkup(React.createElement(GameRoom, { room: luoshenRoom, busy: false, error: "", onAction: async () => true, onLeave: () => {} }));
  assert.match(luoshenReadyHtml, />Use Godess of Luo River<\/button>/);
  assert.match(luoshenReadyHtml, />Skip<\/button>/);
  const luoshenBusyHtml = renderToStaticMarkup(React.createElement(GameRoom, { room: luoshenRoom, busy: true, error: "", onAction: async () => true, onLeave: () => {} }));
  assert.match(luoshenBusyHtml, /<button[^>]*disabled=""[^>]*>Use Godess of Luo River<\/button>/);
  assert.match(luoshenBusyHtml, /<button[^>]*disabled=""[^>]*>Skip<\/button>/);
  assert.doesNotMatch(luoshenBusyHtml, /Resolving…|Skipping…/);

  const pickerRoom = normalizeRoomData({
    code: "SAFE-PICKER", status: "playing", maxPlayers: 4, isHost: true, isTestController: true, meId: "p1", myRole: "Lord", myHeroOptions: [],
    players: [
      { id: "p1", name: "ME", seat: 0, hero: "zhang-fei", hp: 3, maxHp: 3, alive: true, connected: true, handCount: 0, equipmentCards: [], judgementCards: [], attackRange: 1, distance: null, isHost: true, role: "Lord" },
      { id: "p2", name: "TARGET", seat: 1, hero: "guan-yu", hp: 3, maxHp: 3, alive: true, connected: true, handCount: 0, equipmentCards: [card("armor", "NioShield")], judgementCards: [], attackRange: 1, distance: 1, isHost: false, role: "Rebel" },
    ],
    myHand: [], turnSeat: null, phase: "response", deckCount: 0, discardTop: null, log: [], timeline: [], isMyTurn: false, actionPlayerId: "p1", actionReason: "Use Frost Sword", isMyAction: true,
    pending: { kind: "trigger" }, currentAction: { version: 3, kind: "trigger", actorId: "p1", deadline: 0, reason: "Use Frost Sword", legalActions: ["trigger", "decline_trigger"], triggerEvent: "damage_about_to_apply", triggerOptions: [{ effectId: "frost_sword_damage_about_to_apply", label: "Use Frost Sword", selection: { type: "target_cards", targetId: "p2", min: 1, max: 2, eligibleKeys: ["hand:3", "hand:0", "hand:1", "hand:2", "not-eligible", "armor"] } }], declineAction: "decline_trigger" },
    pendingAttack: null, pendingGreenDragon: null, pendingRockCleaving: null, pendingFrostSword: null, pendingDuel: null, pendingGroup: null, pendingNegation: null, pendingHarvest: null, pendingTargetCard: null, pendingBorrowedSword: null, pendingDying: null,
  });
  const pickerHtml = renderToStaticMarkup(React.createElement(GameRoom, { room: pickerRoom, busy: false, error: "", onAction: async () => true, onLeave: () => {} }));
  assert.equal((pickerHtml.match(/aria-label="Hidden hand card \d+"/g) ?? []).length, 4, "target_cards renders every eligible hidden hand key without using handCount");
  assert.equal((pickerHtml.match(/class="target-card-picker-card concealed-card/g) ?? []).length, 4, "hidden hand buttons use the picker-specific concealed-card class");
  assert.doesNotMatch(pickerHtml, /class="target-card-picker-card hidden(?:\s|[^"]*")/, "hidden hand buttons do not use Tailwind's standalone hidden class");
  assert.match(pickerHtml, /aria-label="Nio Shield/);
  assert.doesNotMatch(pickerHtml, /aria-label="not-eligible"/);
  const pickerBusyHtml = renderToStaticMarkup(React.createElement(GameRoom, { room: pickerRoom, busy: true, error: "", onAction: async () => true, onLeave: () => {} }));
  assert.match(pickerBusyHtml, /<button[^>]*disabled=""[^>]*>Skip<\/button>/);
  assert.match(pickerBusyHtml, /<button[^>]*disabled=""[^>]*>Use Frost Sword<\/button>/);
  assert.doesNotMatch(pickerBusyHtml, /Resolving…|Skipping…/);

  const choicePayload = {
    code: "SAFE-CHOICE", status: "playing", maxPlayers: 4, isHost: false, isTestController: true, meId: "p2", myRole: "Rebel", myHeroOptions: [],
    players: [
      { id: "p1", name: "ATTACKER", seat: 0, hero: "zhang-fei", hp: 3, maxHp: 3, alive: true, connected: true, handCount: 1, equipmentCards: [], judgementCards: [], attackRange: 1, distance: null, isHost: true, role: "Lord" },
      { id: "p2", name: "TARGET", seat: 1, hero: "zhen-ji", hp: 3, maxHp: 3, alive: true, connected: true, handCount: 2, equipmentCards: [], judgementCards: [], attackRange: 1, distance: 1, isHost: false, role: "Rebel" },
    ],
    myHand: [card("target-hand-0"), card("target-hand-1")], turnSeat: 0, phase: "response", deckCount: 20, discardTop: null, log: [], timeline: [], isMyTurn: false, actionPlayerId: "p2", actionReason: "Choose how to resolve Yin-Yang Swords", isMyAction: true,
    pending: { kind: "trigger" }, currentAction: { version: 3, kind: "trigger", actorId: "p2", deadline: 0, reason: "Choose how to resolve Yin-Yang Swords", legalActions: ["trigger"], triggerEvent: "attack_targeted", triggerOptions: [{ effectId: "yin_yang_swords_attack_targeted", label: "Yin-Yang Swords", allowDecline: false, timeoutChoiceId: "draw", selection: { type: "choice", choices: [{ id: "discard", label: "Discard 1 hand card" }, { id: "draw", label: "Allow attacker to draw 1 card" }], eligibleHandKeys: ["hand:0", "hand:1"] } }] },
    pendingAttack: null, pendingGreenDragon: null, pendingRockCleaving: null, pendingFrostSword: null, pendingDuel: null, pendingGroup: null, pendingNegation: null, pendingHarvest: null, pendingTargetCard: null, pendingBorrowedSword: null, pendingDying: null,
  };
  const choiceRoom = normalizeRoomData(choicePayload);
  const choiceHtml = renderToStaticMarkup(React.createElement(GameRoom, { room: choiceRoom, busy: false, error: "", onAction: async () => true, onLeave: () => {} }));
  assert.match(choiceHtml, /class="target-card-picker-panel choice-trigger-panel/);
  assert.match(choiceHtml, /YIN-YANG SWORDS/);
  assert.match(choiceHtml, /Discard 1 hand card/);
  assert.match(choiceHtml, /Keep hand — attacker draws 1 card/);
  assert.doesNotMatch(choiceHtml, /aria-label="Hidden hand card \d+"/, "hand cards stay hidden until discard is chosen");
  assert.doesNotMatch(choiceHtml, />Yin-Yang Swords<\/button>/, "mandatory choices open without a trigger activation button");
  assert.doesNotMatch(choiceHtml, /Skip/, "mandatory Yin-Yang choice has no Skip action");
  const choiceBusyHtml = renderToStaticMarkup(React.createElement(GameRoom, { room: choiceRoom, busy: true, error: "", onAction: async () => true, onLeave: () => {} }));
  assert.match(choiceBusyHtml, /<button[^>]*disabled=""[^>]*>Confirm choice<\/button>/);
  assert.doesNotMatch(choiceBusyHtml, /Resolving…|Skipping…/);

  const discardChoiceHtml = renderToStaticMarkup(React.createElement(MandatoryChoiceDialog, {
    option: choicePayload.currentAction.triggerOptions[0], selection: choicePayload.currentAction.triggerOptions[0].selection, selectedChoice: "discard", selectedKeys: [], disabled: false, error: "",
    hand: choicePayload.myHand,
    onChoice: () => {}, onToggle: () => {}, onConfirm: () => {},
  }));
  assert.equal((discardChoiceHtml.match(/aria-label="Attack [A-Z0-9]+[♠♥♦♣]"/g) ?? []).length, 2, "mandatory discard choice exposes the actor's private hand cards");
  assert.doesNotMatch(discardChoiceHtml, /Hidden hand card|concealed-card|>\?<\/span>/, "mandatory own-hand choices do not use concealed card backs");

  const noHandRoom = normalizeRoomData({
    ...choicePayload,
    code: "SAFE-CHOICE-NO-HAND",
    players: choicePayload.players.map((player) => player.id === "p2" ? { ...player, handCount: 0 } : player),
    myHand: [],
    currentAction: { ...choicePayload.currentAction, triggerOptions: [{ ...choicePayload.currentAction.triggerOptions[0], selection: { type: "choice", choices: [{ id: "draw", label: "Allow attacker to draw 1 card" }], eligibleHandKeys: [] } }] },
  });
  const noHandHtml = renderToStaticMarkup(React.createElement(GameRoom, { room: noHandRoom, busy: false, error: "", onAction: async () => true, onLeave: () => {} }));
  assert.match(noHandHtml, /Keep hand — attacker draws 1 card/);
  assert.doesNotMatch(noHandHtml, /Discard 1 hand card/);
  assert.doesNotMatch(noHandHtml, /Hidden hand card/);
});

test("the implemented Standard hero cards expose their printed English skill metadata", () => {
  const expected = {
    "cao-cao": ["Treachery", "Entourage"],
    simayi: ["Retaliation", "Necromancy"],
    "xiahou-dun": ["Stauchness"],
    "zhang-liao": ["Assault"],
    "xu-chu": ["Bared Bodied"],
    "guo-jia": ["Jealousy of God", "Legacy"],
    "zhen-ji": ["Empress Dowager", "Godess of Luo River"],
    "yue-jin": ["Dauntless"],
    "liu-bei": ["Benevolence", "Influencing"],
    "guan-yu": ["God of War"],
    "zhang-fei": ["Battle Cry"],
    "zhuge-liang": ["Stargazing", "Empty Fortress Strategem"],
    "zhao-yun": ["Braveheart"],
    "ma-chao": ["Horse Riding", "Cavalry"],
    "huang-yueying": ["Cultivation", "Wizardry"],
    "lady-gan": ["Divine Wisdom", "Prudence"],
    "sun-quan": ["Equilibrium", "Deliverance"],
    "gan-ning": ["Ambushment"],
    "lü-meng": ["Composure"],
    "huang-gai": ["Self Sacrifice"],
    "zhou-yu": ["Heroic", "Sowing Distrust"],
    daqiao: ["Captivating", "Deflection"],
    "lu-xun": ["Modesty", "Second Wind"],
    "sun-shangxiang": ["Betrothment", "Daredevil"],
    "hua-tuo": ["First Aid", "Prodigal Healer"],
    "lü-bu": ["Unrivaled"],
    "diao-chan": ["Lust", "Beauty Outshining the Moon"],
    huaxiong: ["Triumphant"],
    "gongsun-zan": ["Militia"],
    "pan-feng": ["Axe of Insanity"],
  };
  for (const [id, names] of Object.entries(expected)) {
    const hero = STANDARD_HEROES.find((candidate) => candidate.id === id);
    assert.ok(hero, `${id} is in the Standard roster`);
    assert.deepEqual(hero.skills.map((skill) => skill.name), names);
    assert.ok(hero.skills.every((skill) => skill.description && !skill.description.includes("metadata pending")), `${id} has printed skill descriptions`);
  }
  const luXun = STANDARD_HEROES.find((hero) => hero.id === "lu-xun");
  assert.deepEqual(luXun?.skills, [
    { name: "Modesty", description: "Passive: You cannot be targeted by [Steal] and [Overindulgence]." },
    { name: "Second Wind", description: "You may draw 1 card when you lose your last hand card." },
  ]);
});

test("a normalized Negation response retains its legal controls", () => {
  const room = normalizeRoomData({
    code: "SAFE3", status: "playing", maxPlayers: 4, isHost: true, isTestController: true, meId: "p1", myRole: "Lord", myHeroOptions: [],
    players: [{ id: "p1", name: "ME", seat: 0, hero: "zhang-fei", hp: 3, maxHp: 3, alive: true, connected: true, handCount: 1, equipmentCards: [], judgementCards: [], attackRange: 1, distance: null, isHost: true, role: "Lord" }],
    myHand: [card("negation", "Negation")], turnSeat: 0, phase: "response", deckCount: 0, discardTop: null, log: [], timeline: [], isMyTurn: true, actionPlayerId: "p1", actionReason: "Play Negation or pass", isMyAction: true,
    pendingAttack: null, pendingGreenDragon: null, pendingRockCleaving: null, pendingFrostSword: null, pendingDuel: null, pendingGroup: null,
    pending: { kind: "negation" }, currentAction: { version: 1, kind: "negation", actorId: "p1", deadline: 0, reason: "Play Negation or pass", legalActions: ["respond", "decline_response"] },
    pendingNegation: { kind: "negation", sourceId: "p1", actorId: "p1", effectTargetId: "p1", cardName: "Something Out of Nothing", responseTarget: "Something Out of Nothing's effect on ME", negated: false, deadline: 0 },
    pendingHarvest: null, pendingTargetCard: null, pendingDying: null,
  });
  assert.ok(room?.pendingNegation, "the normalizer must keep a valid public Negation DTO");
  const html = renderToStaticMarkup(React.createElement(GameRoom, { room, busy: false, error: "", onAction: async () => true, onLeave: () => {} }));
  assert.match(html, /Play Negation/);
  assert.match(html, />Skip<\/button>/);
  assert.doesNotMatch(html, /Waiting for the latest response state/);
});
