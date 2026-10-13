# WTK UX2 — Simplified Public Card UX

**Version:** 2026-10-13 · **Branch:** `ux-v2` · **Status:** New product direction approved; implementation and on-device acceptance pending.

This file is the **single active UX2 product/design authority**. It replaces the superseded, much longer UX2 design; previous revisions exist only in Git history. Older `docs/UX_V2_INTERACTION_STAGE_DESIGN.md`, historical roadmap records, old tests and screenshots are references to prior implementation, **not** permission to reinstate old visual requirements.

**Product decision:** Remove all visible causal/relationship diagrams. There are **no** green source tethers, red target arrows, card-to-card counter lines, route forks, graph lanes or central causal graphs in the new UX2. Explain public gameplay with **one short centre-screen card reveal, a medium public thumbnail parked at the actual author's seat, succinct text and the existing local decision controls**. No duplicate central Hero portrait or large `EFFECT`/`REACTION CHAIN` panel.

**Safe delivery order (mandatory):**
1. `UX2-NO-GRAPH-REMOVAL-01` — remove obsolete visible visualizers/duplicate combat panels while keeping the game playable with truthful static public card display. **STOP for user review.**
2. `UX2-CENTRE-REVEAL-SEAT-CARDS-02` — build the shared centre reveal → owner-seat thumbnail UX, **starting with Attack/Dodge and damage**, then separately review extensions to Duel, Negation, Group/AOE and other public cards. **STOP after each approved slice.**

These are the **only two current migration task IDs** in this design. Sections 1–7 are product requirements, not automatically assigned extra tasks. The Coding Agent owns `HANDOVER.md`; Planner/Reviewer does not edit it.

## 1. Authority, gameplay and privacy

1. **Server authority:** Real rules, attack legality, Duel continuation, Negation eligibility, damage, deadlines and card conservation remain unchanged. `CurrentAction` alone controls private selectable Hand cards, legal providers, Confirm, Cancel, Skip and End. Never reconstruct legal actions in React.
2. **Public event authority:** `PresentationV2`, `PresentationSnapshot` and validated public events/proofs determine genuine public card identity, played-as conversion, actor, target, committed order and settlement. Do not derive identity or causality from seat index, player name, HP change, latest animation, inferred Hand composition or merely observing a private selection. A private selected card **must not** become a public reveal.
3. **Privacy:** An opponent's Hand content, private response opportunities, hidden roles, anonymous target-card identities and skill options stay secret. Public Hand **count**, public Equipment, public Judgment and public skills may be displayed where permitted. A host may control only server-authorized test players, not take over a human participant.
4. **Seat ownership:** Actual opponent Seats and the Local Player Dock stay fixed. A public card parks in front of its **server-proven actor's** physical Seat/Dock on *each viewer's* screen; source and target are facts, never inferred from geometry.
5. **One public copy:** A committed card may change visible position/scale while transitioning but must not be simultaneously duplicated by a legacy animation, old Stage and new presenter. Any public information missing validation **fails closed**, with a readable neutral waiting state when needed, never a fictitious CardFace or an incorrect source/target.
6. **No gameplay blocking:** Presentation may not delay or stretch authoritative response windows, turn progression, damage, card submission or network updates. Timers continue from the server deadline.
7. **One-screen interaction:** The player must still see their Hand, Skills, response Guidance, timer and legal buttons. Public card animation is *informational only*; card reveal/parking must never steal interaction focus or intercept touches.

## 2. Battlefield layout — iPhone-first

The screen has three stable areas:

| Area | Responsibility | Placement |
| --- | --- | --- |
| Physical opponent Seats | Who is at the table; HP, public information, available test-player Switch | Fixed top-row or side-column topology |
| **Central battlefield** | **At most one active, newly committed public CardFace** and one short true public event message | Centred within measured safe usable battlefield, not over Seats or Guidance |
| Local Player Dock | The viewer's Hero, Skills, Equipment, private Hand and `CurrentAction` commands | Fixed at bottom; never displaced by a reveal |

### 2.1 Centre card

- During **REVEAL**, use the actual current-device normal **Hand CardFace** size, initially around **60×90 CSS px** where that matches current Hand CSS. The card preserves actual art, suit, rank and identity. Do not make it an enormous full-Stage poster.
- Place it at the measured visual centre of the usable battlefield, not halfway down the full phone viewport. Keep readable whitespace and a short message such as `Cao Cao used Attack on Zhao Yun`, using real public actor/target identifiers. The central slot must clear before the next reveal.
- No duplicated central player/target illustration; player identity remains anchored in the genuine seat.

### 2.2 Seat-front public card thumbnails

- After centre reveal, shrink **the same public card instance** to an initial medium thumbnail of approximately **48×72 CSS px** (or 50×75) with original 2:3 proportion and readable rank/suit/name.
- **Opponents in top row:** place the thumbnail **just below their actual Hero Seat**, clearly associated with that player without covering HP, name, Hand count, VIEW or SWITCH.
- **Side-column opponents:** place beside the Seat's **battlefield-facing inward edge**.
- **Local player:** place the card **immediately above the Local Dock**, on the battlefield side, not inside the private Hand or on top of Guidance/Confirm/Skip.
- Derive anchor rectangles from the actual DOM Seat/Dock identified by server player ID. Recompute safely for phone/wide/4–8 seat layouts and resize; when full size cannot fit, use contained compact layout or a small verified recent-card count. Never relocate a physical Seat to create space.
- Per active interaction, show **the latest public card for each involved player**, with at most one recent subdued predecessor when space allows. Older genuine public cards may be represented by `+N` history count; never pile a long chain across the battlefield. Do not create a thumbnail for a player who has not actually submitted a public card.

### 2.3 Visible emphasis

- A current public card/recent newly parked card may have a restrained gold/red/blue outline based on *card or result emphasis*, not a route or link.
- Pending **Attack against the current viewer** gives the **existing Local Dock response/Guidance panel a red-accented border and readable instruction**; the entire screen should not become a blocking red modal. When the legal response ends, this border promptly retires.
- Target selection uses a normal selected Seat accent; settled outcomes belong adjacent to the **true affected player's Seat/Dock** as short labels. Colour always has accompanying readable text or an icon.
- Do not show persistent DECK/DISCARD blocks as central combat compositions. Real deck/discard semantics and any separate legitimate pile action are preserved.

## 3. The one public-card presentation lifecycle

For each newly **server-confirmed, visible public played-card event**:

1. **REVEAL:** Show the real physical CardFace at Hand size in the centre and the public action sentence. Initial readable beat **~500–800ms**; the user may adjust after actual phone review.
2. **MOVE:** Move that same CardFace centre → the proven author's seat-front location and shrink to medium thumbnail. Initial animation **~250–450ms**. Use a card moving through free space, **not** a colored connecting stroke.
3. **PARK/WAIT:** Keep the public thumbnail at the actor's genuine seat while waiting for the next authentic public response or outcome. Do not show any uncommitted response. The Local Dock alone presents `CurrentAction`.
4. **RESPONSE:** A later genuinely committed public response gets its **own** centre reveal and then parks before **its own author**, independent of who is currently the viewer.
5. **SETTLEMENT:** Show a **server-proven** blocked/damage/negated/otherwise resolved result close to the affected real Seat/Dock. Initial result readability target **~2 seconds**; next independent proven action supersedes old display promptly. Keep the author cards long enough to understand the result; no animation can hold up gameplay.
6. **RETIRE:** Remove expired public cards, overlays and labels without a ghost copy or sudden reappearance.

**Identity/dedupe requirements:** Use real event IDs + public root/interaction + author/card identity and server revision as appropriate. Polling an unchanged room must not restart reveal. Switching test viewers or reloading into an already active interaction should **resume in PARK/WAIT**, not replay old centre reveal. A newly observed authentic event may reveal once to that viewer. Ignore stale/retired independent interactions; make rapid successive submissions queue **at most genuine committed public reveals**, with latest settled truth and controls always immediately available.

**Reduced motion:** Do not translate/scale animate when reduced motion is requested; show a readable brief static centre card and then a seat-front thumbnail with equivalent action text. Ensure assistive technology announces meaningful actions/results without duplicate rapid-fire live regions.

**Zero graph elements:** The new public card presenter must never render SVG relationship connectors, coloured authored/effect strokes, arrows, line branches or graph-only card nodes. Implement geometry for *positioning moving card sprites*, not for representing relationships.

## 4. Authoritative reference flows

### 4.1 Ordinary Attack → Dodge from both viewpoints

**State A: Local attacker commits Attack.** Before Confirm, only the attacker's private selected Hand card/target selection is visible. After authoritative submission, show the real Attack **centre at Hand size** to viewers for whom it is public; message `Cao Cao used Attack on Zhao Yun`. Then shrink/park it immediately **above Cao Cao's Dock** in Cao Cao's view, or **below Cao Cao's real opponent Seat** in other players' views. The legitimate target and responder are not deduced by watching the animation.

**State B: Defender sees incoming Attack.** In Zhao Yun's viewpoint, the newly visible genuine Attack first appears **in the centre**, accompanied by `Cao Cao used Attack on you`. It then parks at **Cao Cao's true opponent Seat**, not at Zhao Yun. Zhao Yun's existing Local Dock response/Guidance acquires a red accented border and a clear short message, e.g. `Cao Cao attacked you. Play Dodge or Skip.` Show the real response timer and only the options offered by `CurrentAction`. A normal Attack is **not** generally playable as Dodge; physical Attack `AS DODGE` (Zhao Yun Braveheart/Longdan) appears only where the server genuinely allows conversion. Do not reveal a privately selected Dodge or invent a Dodge placeholder.

**State C: Defender confirms Dodge.** After server confirmation, the publicly played genuine Dodge (or an actually proven physical Attack-as-Dodge with correct displayed physical art and played-as label) is shown **centre-first at Hand size** for each viewer. Message `Zhao Yun played Dodge`. Then shrink/park it **above Zhao Yun's Dock** in Zhao Yun's own view, or **beneath Zhao Yun's Hero Seat** in Cao Cao's and observers' views. Keep the older Attack thumbnail at Cao Cao's seat as subdued context until the blocked result is readable. No counter-effect line.

**State D1: Attack blocked.** When verified, show `DODGED` / `Attack blocked` at the true defender seat; leave recent Attack/Dodge thumbnails readable briefly, then retire. Never show `TAKE DAMAGE` simultaneously with a proved successful Dodge.

**State D2: Defender Skip/timeout/no legal Dodge.** Skip itself is **not** proof that damage happened. When server proof establishes real Attack damage, show `TAKE DAMAGE` adjacent to Zhao Yun's actual Seat/Dock (and accurate real HP state). Maintain a readable ~2s result, visible to attacker/defender/observer, even if the response round advanced quickly. If prevention/redirect or a special skill changes damage, announce only the actually proven outcome. Do not display a fictitious physical response card.

**All perspectives:** The same true card/actor/result identities must match; placement is different because physical Seats rotate for the viewer. The Local Dock highlight is **only** for the viewer with an actual pending decision. A spectator does not see or activate the defender's legal private Hand.

### 4.2 Duel

- Genuine publicly committed Duel stratagem: centre reveal → **Duel author's seat-front thumbnail**, alongside a short statement identifying two public participants. During any genuine shared Negation window, the Duel public card remains while all living viewers privately receive their own server-authorized Negation/Pass options in the Local Dock (or a private submitted state). No gigantic Duel/EFFECT/NEGATION panels.
- Once `DUEL_EXCHANGE` is authoritative, each genuinely committed **Attack** in response gets its own **centre reveal → actual responding player's seat**. Participants alternate according to server state, never a local inferred sequence. **Do not display Dodge as a Duel answer.**
- Each duelist's own seat area may show their latest Attack thumbnail and a small `+N earlier` count. Current real responder sees `Play Attack or Skip` or the exact canonical `CurrentAction` instruction. No four-card battle diagram, multi-row path layout, fake pending Attack, duplicate root or chain text wall.
- A legally terminated Duel shows the verified damage/failure/other outcome at the true affected player. Same interaction does not restart its root card reveal on each round. Non-public pending response options stay private.

### 4.3 Negation and counter-Negation

- With an open Negation opportunity but **no submitted Negation**, show **only the original genuinely public action's card** at its author's seat and one compact public effect sentence; no provisional Negation CardFace, no private responder leak, no verbose `NEGATION RESPONSE`, `EFFECT` or `REACTION CHAIN` panel.
- Each newly confirmed Negation/counter-Negation shows the real CardFace **at centre then at its author's seat**, with the most recent public response strongest. Older same-interaction cards remain subdued/compact and a history count may replace overflow.
- Only server-proof outcome decides `effect negated`, `effect restored` or continuation. Preserve per-viewer private Local Dock's `Play Negation or Pass` (or `Pass` only) options and one shared, server-authoritative window deadline. Never infer parity of the public counter chain to change game rules.

### 4.4 Group/AOE and other public cards

- Root Barbarian Invasion, Raining Arrows, Oath etc. genuine public played card: centre reveal → source's owner-side thumbnail. Subsequent *actually committed* Attack/Dodge/Negation from eligible participants reveal individually and park before each true author. Compact per-player `waiting / responded / avoided / damaged` information must be backed by real public statuses; no imaginary responses or per-target connectors.
- For a current Raining Arrows defender, use the authoritative Dodge providers; keep unrelated Hand cards visible but subdued. If no legal Dodge is available, the explicit local choice may be `TAKE DAMAGE` (per server-projected legal action), **not** a meaningless disabled Confirm. Numeric damage is never guessed.
- Genuine event-specific card displays (equipment, Judgment, Private Draw, Bumper Harvest, theft/discard selection, Hero skill continuations) keep their own rules in §5. No fabricated CardFace for skills without a real publicly played physical card. Generic skill notices remain small and nonblocking.

## 5. Existing UX2 functional designs that remain approved

These are **current functional requirements**, not old combat-graph tasks. They remain in force during both migration phases.

### 5.1 Hero Skills band (old §1)

- The Local Hero's Skills area next to the portrait is the **single activation entry point** for the viewer's actionable Hero skills. Fill available width: one skill uses full Skills band; two peer skills use equal width and equal height; names wrap naturally (prefer one line for Cao Cao's `TREACHERY` / `ENTOURAGE` when room permits). Touch targets at least **44×44 CSS px**; no clipped text or character-by-character wrapping.
- Skills requiring legal card/target/card-position selection launch the existing authoritative selection flow; generic Confirm/Cancel may remain in the Action Row, but **do not duplicate `Use <Hero Skill>` there**. Passives are clearly non-actionable; optional triggers become actionable only from server-projected choice.
- A *different* Hero's passive response choice offered to this viewer is a Local Dock decision, **not** an activation button for the viewer's Hero. Retain provider IDs, revisions, selection reset, privacy and all Standard roster reachability.

### 5.2 Zhuge Liang skills and private Stargazing (old §4)

- Actionable **Stargazing** is distinguishable from passive **Empty Fortress Strategem**; no duplicate generic action skill button. Private Stargazing has **three vertically ordered zones**: `TOP OF DECK`, `REVEALED CARDS`, `BOTTOM OF DECK`.
- Four initially private revealed CardFaces begin in the middle zone; Top and Bottom begin empty but remain usable drop zones. Touch-hold/pointer drag supports assignment, moving between zones and reordering **within** a zone; visible insertion indicator, no duplicated/lost card, cancelled drag leaves prior state, normal scrolling when not dragging. On a ~390px phone show the four recognisable cards together when feasible; compact zones, contained overflow when necessary, no huge three-buttons-per-card grid.
- `Top` left→right is next draws first; `Bottom` left→right is placed after the remaining deck. Local lists `unassigned`, `top`, `bottom` each contain each card ID **exactly once**. `COMPLETE STARGAZING` is enabled only when `unassigned` is empty and authoritative `minTop/maxTop` constraints are satisfied; **all-to-Top or all-to-Bottom is legal if allowed**. Existing submission contract remains `{providerId:"private_deck_reorder",topCardIds,bottomCardIds}`. Keep server order, revision/busy guards, private-only visibility and keyboard/screen-reader movement alternative.

### 5.3 Response guidance, timer and System Menu (old §§3, 4A)

- The Local Guidance area describes the **actual next decision** (`Play Dodge or Skip`, `Play Negation or Skip`, `Take Damage` when the authoritative alternative applies), rather than implementation jargon like `Group Resolution`. Only real legal options are emphasized; unrelated Hand stays visible, subdued if appropriate. No guessed damage amounts.
- Response/event timers share a **compact lower-right battlefield cluster** just above Guidance: numeric timer typically ~52–68×36–44px for response or ~44–64×36–44px for event, separated from the ≥44×44px System Menu button by about 8px. Do not keep a second big timer at the top of the combat screen; preserve exact server deadline, privacy and visible-at rules.
- System Menu remains compact and contains **build SHA, Download UX trace and Exit Game**; no large diagnostics essay, preserve privacy filtering, JSON export, exit confirmation and useful short download feedback.
- Private Draw cards remain viewer-only with clear `ONLY YOU CAN SEE THESE CARDS`; private event layout is content-driven with no large empty Stage. Bumper Harvest and other event-specific timers share the compact cluster, without exposing private card identities or altering event semantics.
- Skill/event `effectNotice` is one **nonblocking black/gold toast** (initial width cap ~320px, body 12–13px, compact padding), collision-safe relative to public cards, true Seats, Guidance/Hand/timer. Use the original verified public message or typed public actor/skill identity only; do **not** infer Dauntless/damage from HP or neighboring events. Event-ID-keyed lifecycle, initially about **2.4 seconds**, cancels/replaces appropriately; never reuse the oversized `turn-notice` overlay style or block another `CurrentAction` (e.g. Sima Yi Retaliation).

### 5.4 Unified compact player Inspect (old §4B.12)

- **Exactly one** compact public-information inspector. Selecting a legal opponent or using their Inspect affordance opens/updates the **same panel**, never `PREVIEW TARGET` + separate overlapped `INSPECT`. Changing the *inspection subject* alone must not silently change the legally selected gameplay target; clicking a legal target Seat may explicitly select it. Closing Inspect preserves an existing valid target/Confirm state.
- iPhone 17 Pro Max-style black/gold **upper/middle battlefield floating panel**, not full screen: use ~88–94% of usable safe width where feasible and content-driven height, roughly 40–50% battlefield-height cap with **internal scrolling** for overflow. Do not cover opponent Seats, Hand, Guidance or Confirm/Cancel; one close × control, no `View Details` button and no automatic full detail screen.
- Show name, recognisable Hero portrait, public HP, Hand **count** (not card identities), named public skills, actual public Equipment Weapon/Armour/+1/−1 horse, and public Judgment cards or `None`. Any hidden role remains hidden. **Tap skill name to expand its canonical description inside the same panel**, tap again to collapse; informational only, not skill activation. No invented equipment or hand-back identities.
- Use actual server public data; compare equipment-rich real 4-player/6–8-seat cases and long skill descriptions, ensuring no overlapping panels or disabled local controls.

### 5.5 Separate authoritative target-card picker (old §4C)

- The **interactive** card-selection modal is distinct from passive Inspect. Used for genuine server-offered options, e.g. **Retaliation (Sima Yi), Dismantle/Burning Bridge, Steal, Frost Sword, Kirin Bow**, and only other effects that expose real selectable keys.
- One shared black/gold modal with clear target/effect title, authentic legal zone options, selection count, use/Cancel controls. Zone order **HAND → EQUIPMENT → JUDGMENT**; omit inapplicable empty zones. Selection is shown with consistent gold border/check and non-colour indicator; action row remains usable/≥44px touch targets.
- **Opponent Hand anonymity is absolute:** when server provides opaque `hand:0`, `hand:1` etc, show separate selectable **face-down** positions (normally all four visible together on 390px where feasible); never reveal rank, suit, art or inferred identity. When only a *single Hand-zone key* is provided, show a grouped/random Hand-zone fallback; **never invent individual choices**. Larger Hands use contained scroll/controlled overlap, not tiny slivers.
- Actual public Equipment and Judgment card positions appear face-up as eligible separate selections. Mixed-zone cases must work, including Hand + Equipment + Judgment and Frost Sword selection of **1–2 cards when that is the authoritative min/max**. Only exact legal keys can be selected; selection clears on action revision or target change.
- Modal primary controls are single owner of `Use Retaliation / Dismantle / Steal / Frost Sword / Kirin Bow` etc; no duplicate Dock confirmation for the same modal. Cancel does not send an action. Do not use a card picker for random or forced effects without legal card-level choice. Keep local action validation and hidden-hand privacy unchanged.
- At 390×844, ~440px, 480×900 and wide, prove actual mixed zone geometry, all four anonymous positions, selection clear, action buttons, no page overflow and no click-through.

## 6. Visual quality and production-path acceptance

**Mandatory functional checks (no fixture-only completion claims):** genuine server-backed four-player game, with authorized host-controlled test players when switching is needed. Test at 390×844, **~440px CSS iPhone 17 Pro Max**, 480×900, one wide viewport, and 4/6/8 Seat topology where relevant.

**New visual invariants:**
- **Zero** source-target/card-card relationship strokes, SVG arrows, old connector portals, historical route lines or per-player branch visualization.
- **Zero** old giant `EFFECT / NEGATION RESPONSE / REACTION CHAIN / Duel Exchange metadata` panels over normal gameplay.
- One centre public CardFace during each legitimate reveal; no second legacy copy. A truthful per-player thumbnail appears only when that author really played a public card.
- Real viewer-specific top Seats/Local Dock do not move. The public card for a given actor parks before that actor in **all** views; no player-to-card identity mismatch.
- Legal controls, visible response timer, touchable Hand, Inspect, skill buttons and System Menu continue functioning while cards reveal/park. No page horizontal scrolling, Seat/Guidance/Dock overlap or clipped card.
- Skip and timeout never generate fictitious Dodge or unsupported damage. Real blocked/Damage outcome visible near actual target long enough to read.
- Fast response/poll/refresh/test-view switch/reduced motion cannot repeat or leak a historical reveal. Public presentation never reveals hidden Hand identities or a private responder.

**Evidence grading:** Rule/API pass → public projection pass → browser fixture pass → real authenticated browser/game path pass → deployed device screenshot → **user visual acceptance**. CI or a mounted DOM element alone never proves the final UX. Capture actual visible screenshot and IDs/build SHA; report unsupported proof/fallback honestly.

**CI policy:** normal required push-to-CI-to-Cloudflare deployment/smoke target **≤6:00 wall clock**. Retain small meaningful build/typecheck, lint, rules/API/privacy and startup smoke; do not add large unapproved visual matrices to mandatory push CI. Heavy display/4–8-seat tests run focused/opt-in until user approves them. Do not suppress real errors or remove real safety coverage merely to pass CI.

## 7. Agent execution plan — TWO independent deliverables

**Source inspection (2026-10-13 `ux-v2`):** `app/page.tsx` mounts `InteractionRootOverlay` and toggles `InteractionStage` based on layout readiness (`rootActionOverlayGraphReady`, `rootActionOverlayOwnsComposition`, `rootActionOverlayDisplayMode`); `TableResolutionSequence` also renders public played-card events. `app/interaction-root-overlay.tsx` is the large SVG/routing/card-placement implementation. `app/sequence-overrides.css` and `app/globals.css` retain related selectors. Existing hit/Dodge settlement holds and some event retirement are currently coupled to graph readiness. `game/presentation-v2.ts`, `game/presentation-snapshot.ts`, `game/presentation-client.ts` and local room/response contracts own validated public semantics and must be preserved. These are implementation targets, not assumptions about any later SHA.

### Task 1 — `UX2-NO-GRAPH-REMOVAL-01` — remove old UI safely

**Goal:** First deliver a **playable, truthful, static, graph-free** intermediate UX. Do **not** implement the new motion/thumbnail animation in this task.

**Required steps:**
1. Inspect current `ux-v2` working tree/latest remote SHA and the above files. Preserve unrelated changes. Capture the current failure screenshot and identify all active render owners for public card display, not only the old SVG paths.
2. **Eliminate graph rendering and competing legacy public-combat composition.** Unmount `InteractionRootOverlay` and remove/retire its graph-only SVG path, arrow markers, fit/ready/fallback state and physical-route geometry engine **once their semantic readers have been safely migrated**. Remove the visual `SingleTargetNegationCausalComposition`/old oversized Duel/Negation Current Effect panels and prevent `TableResolutionSequence` from creating a second oversized CardFace. Preserve unrelated private Draw/Judgment/Harvest/skill choice presentations.
3. Put in **one lightweight static, validated public card presenter** as the temporary replacement: show the current actually committed public root/response `CardFace` (and a brief verified actor/target sentence) in a bounded central container while the interaction is active; retain recent proven public response as subdued context only if needed. One presentation owner decides whether a public event is displayed. No source/target/path graphics; no invented root or fake `Dodge`.
4. **Critical lifecycle extraction:** Decouple all existing Attack/Dodge settlement, attack-hit `TAKE DAMAGE`, public Negation read and other active outcomes from `rootActionOverlayGraphReady` / measured SVG geometry. Continue to use genuine typed public proofs, settle/retirement identities and server supersession. Do not let removal instantly hide a confirmed damage/blocked result; preserve a **~2 second visible result** in the static phase. Legal current response, timers and card identity still work with a fixed or resumed static read. No graph-only timeout becomes a gameplay rule.
5. Delete orphaned **visual** graph imports/state/effects/components/CSS selectors and obsolete positive graph-shape assertions/tests; migrate useful proof/privacy/fail-closed tests to the new static presenter. Do not blindly delete source libraries if other real call sites depend on them. Never delete `CurrentAction`, public proof generation/validation, Duel or Negation continuation, room API, settlement data, source/target IDs or rules tests.
6. Confirm a real four-player game still reaches: **Attack pending Dodge**, real Dodge and Skip→proven damage; **Duel with open Negation and one genuine response Attack**; one live Negation or Group/AOE opportunity. New display must not revert to an empty battlefield or the old large panels when a branch changes.
7. Preserve secure generated-test-player SWITCH only for authorized controller and generated/host views; never broaden to a real person's private session. Test responsiveness, keyboard/touch, viewer privacy and reduced-motion static output.

**Required acceptance:** Zero graph SVG paths/arrow markers/coloured relationship links; zero old giant combat panels; exactly one public static CardFace presentation owner; real current response buttons work; **TAKE DAMAGE** remains on real target for readable ~2 seconds; no true event becomes an unproved CardFace; no server gameplay rule changed. Verify 390×844, ~440px, 480×900 and wide, with screenshot + IDs from attacker, defender, observer where available.

**Delivery:** Changed-file list, exact source/response proof boundary, screenshots of real scenarios, regression/test commands, CI/deployment exact commit and any known unhandled display limitation. **STOP for user visual acceptance. Do not implement Task 2 yet.** Only Agent may maintain `HANDOVER.md` under its ordinary rules.

### Task 2 — `UX2-CENTRE-REVEAL-SEAT-CARDS-02` — implement new public-card UX

**Start condition:** Task 1 has been reviewed and accepted by the user. Do **not** reintroduce the retired connector/graph framework.

**Step A — Shared event and presentation ownership**
- Replace the temporary static display with one typed *read-only* public card view model: root/interaction ID, distinct public event ID, true actor ID, actual physical card ID and CardFace, validated displayed-as action, public target/outcome when proven, authoritative sequence/settlement identity and viewer-local presentation checkpoint.
- State per new public committed event: `REVEAL → MOVE → PARK`, with `SETTLEMENT → RETIRE` for the root. Never guess hidden response cards, infer events from private `CurrentAction`, or play reveal twice for one event across polls.
- Keep reveal timing advisory only and independent of gameplay; use ~500–800ms legible centre beat + ~250–450ms movement; use a static reduced-motion alternative. Rapid events must be queued/deduplicated without blocking server decision controls.

**Step B — True physical seat placement**
- Obtain real DOM rectangles of every existing opponent Seat and the Local Dock by authoritative player ID. Compute usable battlefield bounds by excluding actual Seats, Guidance, Hand, system cluster and response timer.
- On top-row opponent seats: final thumbnail below that real seat; for the local player: just above Dock; side-column: on inward facing side. Animate a single physical CardFace from the centre of the usable field toward its authenticated author's parking slot while shrinking from Hand size to 48×72 CSS px target. Refit on viewport/viewer topology changes without swapping ownership; if space is limited, use safe compact fallback/history count instead of collisions.
- Avoid duplicate CardFaces during handoff: centre sprite and parked thumbnail are mutually exclusive phases of **one public event**; stop the old static presenter from appearing concurrently.

**Step C — Ordinary Attack/Dodge as the FIRST independently accepted family**
1. Real attacker Confirm → Attack centre, public message, then owner Seat/Dock thumbnail.
2. True defender viewpoint → same newly observed Attack centre, then thumbnail before true attacking opponent Seat; **red-highlight the defender's existing response Dock and show `X attacked you. Play Dodge or Skip`** according to server `CurrentAction`; timer/Hand/Confirm/Skip remain operable.
3. Genuine Dodge Confirm (including proven converted physical Attack-as-Dodge) → authentic Dodge centre with `X played Dodge`, then thumbnail before actual responding player: above their Dock locally, below their hero to others; Attack remains subdued context at its actor's seat.
4. Proved blocked result or **proved damage after Skip/timeout** → short readable public result near real affected Seat/Dock, approx ~2s; never treat Skip itself as proof or create fake Dodge.
5. One identity-valid source card is displayed to attacker, defender and observer in their different actual viewer-relative seat placements; no public hidden Hand leak. Refresh and test-view switching resume parked state without replay. Protect 4/6/8-seat fit.

**Step D — Future card-family rollout, separate Reviewer gates**
- After **Attack/Dodge user visual acceptance**, extend the **same** mechanism to Duel (one Duel root and each genuinely committed Attack answering from its real actor), Negation/counter-Negation and Group/AOE per §4, in small independent reviewable slices. Do not rebuild new graph geometry or bundle every effect into the first Attack/Dodge delivery.
- Equipment/Judgment/Private Draw/Harvest/skill-specific selections stay owned by their existing dedicated UI contracts in §5; no generic public card animation can accidentally reveal private cards.

**Required acceptance for Step C:** Six real-server screenshots from §6 — Attack centre, parked Attack, defender red prompt, Dodge centre, Dodge parked and correct settlement — across attacker/defender/observer views. Real CardFace IDs match public proof; no duplicate animations/overlays, no replays on refresh, no top/Dock/control collisions, no new causal strokes. Show iPhone 17 Pro Max-like ~440px CSS, 390×844, 480×900 and wide; include reduced-motion case and a true no-Dodge damage case. Report event-ID dedupe, placement rectangles, timings, source changes and CI exact SHA. **STOP after Attack/Dodge for user visual acceptance before further families.**

## 8. Execution boundaries

- The current rejection of Duel graph UX supersedes previous B1 implementation/acceptance language; do not continue the old Duel graph implementation or B2/Stage C graph plan.
- `docs/UX2-refine.md` owns *product design and these specifically requested migration task specifications*. `HANDOVER.md` remains the **Agent-owned active execution state**; this Planner document edit does not silently edit or enqueue it. The user chooses when to assign Task 1 and later Task 2.
- Required CI stays ≤6 min ordinary push-to-deploy; heavy UX testing is optional/manual until explicitly accepted. A green build does not substitute for real mobile user review.

## 9. Shared-window Negation with ordered server priority — approved 2026-10-13

**User-approved decision (supersedes the old §9 sequential proposal):** Online WTK uses **one fixed 8-second response window for ALL living players simultaneously**, then **the server chooses ONE valid Negation in canonical seat order**. After a committed Negation, the server opens a **new 8-second shared window** for counter-Negation. This is an explicitly approved ONLINE adaptation of physical sequential reaction order. It preserves deterministic seat priority and counter opportunities, but does not promise full equivalence to seeing earlier seat Pass choices before deciding. No sequential 8-second-per-seat waiting; do not implement the previous proposal.

**Scope:** Rule/transport/privacy change only for Negation and counter-Negation (including Duel, ordinary Stratagem, judgement, Group/AOE per-target and Harvest target Negation). Do not change Attack/Dodge, Duel Attack exchange, rescue, triggers, other card legalities, public card presentation direction, or previously accepted no-graph UX. This is not an additional UX2 visual-migration task ID.

### 9.1 Deterministic window protocol

1. **Open:** When an eligible-to-be-negated effect opens, create one server-authoritative Negation window for **all living seats**. Use the existing effect-specific starting anchor: original Stratagem source for ordinary effects, judgement target for delayed cards, and appropriate current effect target for Group/AOE/Harvest. Persist an opaque unique windowId, canonical start seat, fixed ordered living-seat IDs, parent/root causal identity, chain depth / current negated state, opensAt, deadline = opensAt + 8,000 ms, and privately stored submissions. All viewers see the same window countdown; none see anyone's selection or eligibility.
2. **Offer in parallel:** Each living human receives a PRIVATE CurrentAction for that same window. With an authoritative Negation-capable provider, offer the legitimate response provider(s) and Pass. Without any provider, offer **Pass only**, not a fictitious disabled Negation. A player may submit one private Negation intent (actual provider ID and selection/physical card ID) **or Pass**, and need not respond before timeout (non-submission = Pass). This is an *intent*, not yet a physical played card. Do not enable other gameplay actions during the window.
3. **Individual lock:** A successful intent/Pass submission is locked for that player for this window; their private UI shows “Response submitted — waiting” and can no longer submit again. Other players' options and time are unchanged. A duplicate of the exact same submission is idempotent; a conflicting second submission is rejected without side effects. Do not expose submitted player IDs/counts or early-progress bars publicly. No full-window close before deadline, **even if every player has submitted**, so response speed and card holdings do not alter public timing.
4. **Close at authoritative fixed deadline:** An authorized game request/timer advancement atomically claims the window exactly once. Resolve only the private submitted Negation intents that were received/accepted before deadline, validate their provider/card/eligibility against authoritative game state, and select the **first valid intent by canonical seat order from that window's start seat** (wrapping). The winner is NOT determined by network arrival order, local animation, or client clock. If no valid Negation was submitted, settle the original effect using existing authoritative rule/causal state.
5. **Commit one physical card:** For the winning intent only, perform the usual authoritative card consumption (exactly once), Negation effect toggle, log/public card event, real actor identity and causal history. All losing intents are voided with **zero cards consumed**, even if they submitted earlier/later, and no fake card is revealed. Each player's own private final status can reflect whether their intent was used; other players see only the accepted public card. Ensure card conservation and existing hero provider legality.
6. **Counter window:** If a Negation wins, open a NEW shared 8-second window against that actual Negation. Seat-order priority starts with the **next living seat after the actual committed Negation's actor**, wrapping around; include every living seat (including the last actor upon wrap-around, if a legal provider still exists). All previous losing intents are discarded, **never automatically carried over** as counter-Negations, because the tactical decision/target is different. Repeat for counter-counter-Negation without arbitrary chain-depth cutoff; preserve genuine legal game termination and event proof.
7. **Final settlement:** When a window closes with no accepted Negation, settle the current negated/restored effect exactly once. A Duel must NEVER begin its Attack exchange until the root shared window **and every genuine counter window** complete. Preserve per-target cancellation semantics for multi-target effects.

### 9.2 Concrete seat example and priority

Five seats clockwise **1→2→3→4→5**; seat 1 plays Duel against seat 3.

- Shared window #1: all living seats privately see their own legitimate choice; seat 2 and 4 each submit Negation. At the 8-second deadline **seat 2 wins**, and the server publicly commits seat 2's Negation. Seat 4's card stays in Hand and was never played. Duel is temporarily cancelled.
- Shared window #2: a fresh counter-Negation opportunity is opened to ALL living seats, priority order **3→4→5→1→2**. Seat 4 may now independently decide whether to counter seat 2's played Negation. If seat 4 wins, it is publicly committed and the Duel effect becomes restored; open window #3 starting at seat 5.
- After the first or any subsequent shared window that closes with no successful new Negation, resolve the current root effect state. Seat 3 starts the Duel Attack exchange **only if Duel ultimately remains active**.
- If in window #1 **only seat 4 submits**, seat 4 wins even if seats 1–3 have no Negation. If nobody submits, one 8-second window passes and Duel may start. Do NOT perform five 8-second turns.

### 9.3 Time, privacy, transport and UX invariants

- Define one configurable **NEGATION_WINDOW_MS = 8_000** server-side, used for every root and counter shared window. Keep existing **HUMAN_RESPONSE_TIMEOUT_MS = 60_000** and other established timings unchanged for non-Negation families. The server deadline is immutable after window creation, unaffected by individual Pass/submit, room polling, reconnects, presentation animation, refresh, duplicate timer calls, or out-of-order client requests. Observer responseCountdownVisibleAt = window deadline minus 8 seconds; all see the same start/end.
- **No leak through actor ownership:** This family is no longer modeled as a single pending actor for decision authorization. Introduce a window state (or compatible canonical pending extension) plus **per-viewer** private CurrentAction projection, not a single shared actorId that is reused by the UI. Only each owner sees legal Negation provider IDs, own selectable Hand, own submission status; nobody sees others' choices/Pass, card capabilities or intent IDs.
- On public projections scrub all uncommitted responder/seat signals, including **raw room JSON, pending, actionPlayerId, currentAction, causalEnvelope checkpoint/frame resolvingPlayerId, presentationV2, presentationSnapshot, logs, timeline, debug traces and test-viewer controls**. Distinguish a previously **committed public Negation actor** from confidential pending intent owners. Do not publish raw submittedIds, submitted count, queued card IDs, ranking or “only player X can answer”. The shared deadline, stage and public root effect/source/target may be shown, but not who has a legal card. Test **wire JSON from separate actual human tokens**, not only DOM.
- Existing compact battlefield Response Time cluster shows **one common 8s countdown** and optional short “Negation response window” copy. The Local Dock for a viewer with legal provider: “Play Negation or Pass”; a viewer with none: “No Negation available. Pass.”; a viewer who submitted: “Response submitted — waiting”. Do not show opponent choices. No second timer, big Negation stage, graph/connector, overlay that blocks Hand/Confirm/Skip, or pre-accepted centre CardFace.
- **Critical optimistic-display correction:** app/page.tsx currently creates an optimistic public played-card event in submitResponseProvider(). A private shared-window Negation intent MUST NOT create a public or speculative CardFace, discard movement or effect toggle even locally; only the server-confirmed *winner* may enter the existing centre reveal → actual actor seat thumbnail and public timeline. Reject/ignore stale or non-winning intents without ghost animations.
- Server must validate **windowId + authenticated player identity + deadline + one-intent-per-seat + legal provider + authoritative selection**. Never trust a client-provided seat ranking or client timestamp. Concurrent writes must preserve independent players' intents without lost updates; do not allow one player's submission to invalidate another's stable window ID/revision. Use atomic conditional writes / a dedicated submissions table if needed; serialize close/commit/next-window atomically to prevent double consumption. Do not use an in-memory only window: state survives Cloudflare worker instances, refresh, restart and reconnect.
- A live authorized client can request advance_timers at/after the deadline, but no viewer's response handler may “fast close” the window when all private passes arrive. Ensure the backend progresses correctly under delayed/duplicate timer calls; a genuinely disconnected player contributes no intent and becomes an implicit Pass, never blocks indefinitely. Avoid busy polling and preserve existing deploy/runtime limits.
- **Security caveat:** A common fixed deadline eliminates deterministic **holder-based skip timing**, not every possible information side channel. Public effects reveal only actual played cards. Do not promise that private intent timing is cryptographically hidden from the authoritative server.

### 9.4 Agent delivery in reviewable checkpoints

**A. Canonical window engine (no UX changes first)**
- Inspect app/api/rooms/route.ts: nextEligibleNegationResponder, advanceNegation, advanceNegationDecision, startNegation, startJudgementNegation, per-target Group/Harvest opening, canonical respond/decline_response, resume/resolveDeferredStratagem and window expiry. Inspect game/pending.ts, game/response-decision.ts and causal-envelopes.
- Design the durable window state and per-player submission protocol; use existing effect anchors, provider resolver, real card/event proofs and concurrency guards. Before editing heavy route code, record the new types, settlement transitions and handling of legacy persisted old Negation pending. Implement parallel collection + deterministic one-winner close + proper counter cycles.
- **Gate A:** five-seat Duel unit/API test proving seat 2 and 4 both submit in window #1; seat 2 wins regardless of POST order; seat 4 retains its card; counter window opens after seat 2 and seat 4 may counter independently. Also test nobody submits → exactly one 8s wait.

**B. Privacy, deadline and real network behavior**
- Project private CurrentAction and public common window safely, including all raw serialized causal/trace surfaces, shared responseCountdownVisibleAt, and immutable server deadline. Ensure duplicate/stale/competing intents and timer actions cannot double-commit or overwrite other intents; old windowId cannot act on the new window.
- **Gate B:** three authenticated human tokens; each can submit own private intent or Pass without revealing others' options/hand/progress; shared exact deadline; 60-second non-Negation regression; disconnected clients and late replay safe. Audit API payload, not just browser labels.

**C. Client controls, proofs and regression**
- Update Local Dock for per-viewer Negation intent and submitted state, suppress optimistic event before server winner, and keep old confirmed centre/seat-card renderer for the true committed Negation only. Extend tests/api/privacy-response.test.mjs, stratagems.test.mjs, tests/browser/negation-response-guidance.spec.mjs and response-timer.spec.mjs; replace old “skip ineligible responders” expectations with one shared window.
- Include Duel negated/restored after 2+ counters; root and per-target Group/AOE/Harvest/Judgement; 4/6/8 seats, dead seats, skill providers, stale simultaneous submissions, state refresh/reconnect, card conservation and causal/public proofs. Advance test clock/DB deadline artificially; do not sleep 8s repeatedly in mandatory CI.
- Run focused tests, lint, fast/API, genuine authenticated browser room flow, normal push/deploy smoke. Supply exact commit/build SHA, request/response proofs, screenshots 390px/~440px/480px/wide, gaps and limitations. **STOP for user/Reviewer acceptance** before deferred Duel visual expansion.

**Acceptance:** maximum **8 seconds per Negation/counter round**, not 8s per seat; deterministic priority by canonical seat, not request race; precisely one publicly played winning Negation per round; all other submitted cards remain unspent; losing players may reconsider only in new counter round; zero opponent intent/provider/Hand leakage in wire payload; complete counter chain before Duel Attack exchange; other response families unchanged; no graph or public pre-confirmation.
