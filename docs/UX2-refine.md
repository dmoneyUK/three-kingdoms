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

- Genuine publicly committed Duel stratagem: centre reveal → **Duel author's seat-front thumbnail**, alongside a short statement identifying two public participants. During any genuine Negation window, the Duel public card remains while the eligible private viewer can play Negation/Skip via Local Dock. No gigantic Duel/EFFECT/NEGATION panels.
- Once `DUEL_EXCHANGE` is authoritative, each genuinely committed **Attack** in response gets its own **centre reveal → actual responding player's seat**. Participants alternate according to server state, never a local inferred sequence. **Do not display Dodge as a Duel answer.**
- Each duelist's own seat area may show their latest Attack thumbnail and a small `+N earlier` count. Current real responder sees `Play Attack or Skip` or the exact canonical `CurrentAction` instruction. No four-card battle diagram, multi-row path layout, fake pending Attack, duplicate root or chain text wall.
- A legally terminated Duel shows the verified damage/failure/other outcome at the true affected player. Same interaction does not restart its root card reveal on each round. Non-public pending response options stay private.

### 4.3 Negation and counter-Negation

- With an open Negation opportunity but **no submitted Negation**, show **only the original genuinely public action's card** at its author's seat and one compact public effect sentence; no provisional Negation CardFace, no private responder leak, no verbose `NEGATION RESPONSE`, `EFFECT` or `REACTION CHAIN` panel.
- Each newly confirmed Negation/counter-Negation shows the real CardFace **at centre then at its author's seat**, with the most recent public response strongest. Older same-interaction cards remain subdued/compact and a history count may replace overflow.
- Only server-proof outcome decides `effect negated`, `effect restored` or continuation. Preserve Local Dock's `Play Negation or Skip` options with correct privacy/deadline; never infer parity of the public counter chain to change game rules.

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


## 9. Ordered Negation privacy and deadline refinement — 2026-10-13

**Design request:** Preserve the **existing sequential seat-by-seat** Negation (无懈可击) rules. Do **not** replace with simultaneous decisions, a shared round response window, or public responder indicator. This is a rule/privacy correctness task, **not** a third UX2 public-card migration ID; it must not reintroduce removed graphs. This task explicitly supersedes eligibility-filtered Negation seat scheduling and the inherited 60-second Negation timeout; unrelated response deadlines remain unchanged.

### 9.1 Rules and security

- Original Duel: in a five-player game, seat 1 plays Duel against seat 3. Every living seat **1→2→3→4→5** gets its own opportunity in that order, whether or not they hold Negation. Seat 2's Pass/no-card state must not allow Duel exchange before seat 4 can negate. The effect begins only after Negation/counter-Negation opportunities finish.
- Preserve existing effect-specific ordering anchors: source for ordinary stratagems; judgement target where applicable; current group/harvest target for each target-specific Negation; the next living seat after a publicly committed Negation for counter-Negation. Do not hard-code source for every family. After each real Negation, open a **fresh ordered pass across all living seats**, including the original Negation user on wrap-around if rules allow. Complete chain parity/effect settlement only after the current pass ends.
- **Every living seat receives a real private pending response** independently of whether they have a physical Negation or skill-based eligible Negation provider. Card/skill eligibility determines the **private legal options**, not whether the opportunity exists or whether the seat is immediately skipped. Dead seats remain excluded.
- For the active player with no provider, project only legal private Pass (decline_response), with a clear private guidance message such as “No Negation available. Pass.” Active players with legal providers see their own playable Negation/skill providers plus Pass. All other clients see neutral “Waiting for Negation...” and neither current actor nor response/hand capabilities. Derive legality from CurrentAction, not React guesses.
- Pass and timeout create **no public play card**, seat-specific checking/skipping/pass log or provisional response. A real Negation becomes public only **after server acceptance**, and then opens another ordered counter-Negation pass.
- Scrub private uncommitted responder identity from **all serialized observer-facing fields**: actionPlayerId, CurrentAction actor/options, pendingNegation.actorId, raw causalEnvelope checkpoint/frame resolvingPlayerId, presentationV2, presentationSnapshot, timeline, diagnostics and traces. Keep the full causal envelope internally for trusted rule evaluation and public proof; transport/viewer projections may reveal real committed card actor, never a pending private responder. Test raw HTTP JSON for three different tokens, not only visible UI.
- This removes deterministic card-ownership leaks caused by instant capability-based skipping. Earlier voluntary Pass can still give weak timing clues; **do not claim perfect timing indistinguishability**. Never silently auto-Pass a player merely because their hand has no Negation. Fixed-duration padding would be a separate explicit latency/privacy product choice.

### 9.2 Time policy — 8 seconds per seat, not a shared round clock

- Current code baseline: HUMAN_RESPONSE_TIMEOUT_MS = 60_000 in app/api/rooms/route.ts, and advanceNegation() currently waits **only for a capability-eligible seat**. Existing 60s is too long if applied to every living player.
- Introduce a separate configurable server constant **NEGATION_RESPONSE_TIMEOUT_MS = 8_000**. Each *living seat* gets its own independent 8-second deadline; voluntary Pass advances early. Five living seats can take up to approximately 40s for one full pass, eight up to 64s. A committed counter-Negation starts another sequential pass. **Do not shorten other response types** (Attack/Dodge, Duel Attack, rescue, triggers).
- Arm each seat's Negation timer server-side when its private pending decision becomes active, even with no legal provider or when disconnected. Never reset/extend a deadline upon refresh, polling, stale submission, start_response_timer, or duplicate advance_timers. Expiry is silent Pass and moves one seat forward. Use compare-and-swap/atomic persistence at concurrent transitions.
- responseCountdownVisibleAt must use the **correct current family duration** (8s Negation versus ordinary 60s), not a hard-coded 60s subtraction. Reuse the existing compact lower-right visible server countdown and Local Dock private guidance/Skip, not a second large response panel. The response clock is authoritative and animations must never pause or extend it.
- Any authorized live viewer's advance_timers can drive expired transitions. Expired seat processing, duplicate calls, disconnects and resumed clients must not replay or skip another player's opportunity.

### 9.3 Agent implementation steps

1. **Rule transition:** review app/api/rooms/route.ts functions playersInNegationOrder, nextEligibleNegationResponder, advanceNegationDecision, advanceNegation, startNegation, startJudgementNegation, group/harvest per-target starters, and canonical respond/decline_response. Replace capability-filtered seat selection everywhere with ordered **living-seat** selection. Continue to use responseDecisionFor and provider resolution for private legality. Preserve original ordering anchor for each effect, causal event IDs/frames, and actual Negation history.
2. **Timer:** add the 8s Negation-only policy to all entry/advance/counter paths; keep other responses 60s. Correct responseCountdownVisibleAt, server deadline assignment, concurrency and actionRevision guards. Make no-card seats wait for private Pass or timeout, not instant auto-advance.
3. **Projection/UI:** for no-provider acting Negation seat, private CurrentAction has decline_response alone; render real Local Dock Skip and timer, with no fabricated card/Confirm. For observers, hide current actor even from causalEnvelope and any derived raw transports, retaining true public source/target and committed Negation identities. Continue to use existing seat-card UX and do not add graph elements.
4. **Tests:** revise tests/api/privacy-response.test.mjs which currently asserts immediate skip of ineligible seats. Cover a **five-player 1→3 Duel** with empty 2, Negation at 4, and no Duel exchange before 4; all-no-Negation full pass; counter-Negation from a later seat and restored Duel; multiple counter cycles; expiry and early Pass; dead seats; judgement/group/harvest starts; authorized no-provider private Pass; three-token raw payload privacy; disconnected seat; stale/racy submits and duplicate timers; conservation, causal/public proof, non-Negation 60s unchanged. Simulate deadlines via test DB/fake clock so required CI does not wait full real-time passes.
5. **Browser/real game:** extend tests/browser/negation-response-guidance.spec.mjs and response-timer.spec.mjs with sequential 8s, a no-card active seat, neutral spectator, proper 8s visibleAt, plus genuine authenticated multi-token room. Capture phone (390/~440/480px) and wide screenshots; confirm UI remains touchable, no responder leak, no phantom public Pass, no graph. CI green does not substitute for physical-device review.

**Acceptance:** actual API+gameplay prove each living seat gets exactly one opportunity per pass regardless of capability; seat 4 can negate seat 1's Duel against seat 3 even when 2/3 have no Negation; another player can counter-negate before Duel exchange; 8s per Negation seat with 60s for unrelated responses; no raw/public uncommitted actor/Hand leakage; stable timeout, concurrency, event proofs, card conservation. Run focused + lint + fast + API + normal deploy/smoke (keep ordinary CI target <=6min), report exact commit and evidence. **STOP for Reviewer/user acceptance before broader rollout.**
