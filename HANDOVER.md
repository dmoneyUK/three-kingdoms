# Current Handover

Branch: `ux-v2`

## Latest result

- **`UX2-10.17.1.1-BCP1-F1-HARVEST-CONTENT-FIT-INFO-MINI` — IMPLEMENTED / DEPLOYED, PENDING USER PHONE REVIEW.** Exact SHA `b53148be43f0d8e9fe56b407a42f3af13105fe74`; Actions [39142417611](https://github.com/dmoneyUK/three-kingdoms/actions/runs/39142417611) passed lint/fast, API, browser startup, deploy and production smoke; Worker version `f920eb8b-7a6f-4ef5-a14d-b277108f3be2`. On phone, actor cards measure 78×117 at 390×700 and 88×132 at 440×766; the content-fit frame stays within 20px of the actual row width, each card keeps an independent lower-centred 44×44 Info target, and the 40×60 parked root now scales its corner, title and type marks proportionally. Before: 390px cards were 62×93; the root corner was 8×13 with 5px rank/4px suit. The lifecycle regression measures the same physical card/event at reveal, move, parked and thumbnail. Three focused Bumper Harvest browser tests passed, covering 1/2/4/6/8-card pools, 4/6/8 seats, touch swipe, actor selection/re-tap/Confirm, spectator read-only/SWITCH, Inspector and Card Details. Local build, focused ESLint and `git diff --check` passed. No desktop validation was run.
- **`UX2-10.17.1.2-BCP1-F2-HARVEST-NEGATION-READONLY-POOL` — IMPLEMENTED / DEPLOYED, PENDING USER PHONE REVIEW.** Exact SHA `6836aa2905a3dc71f7d8dfde8619ae190f6f4e14`; Actions [39131345860](https://github.com/dmoneyUK/three-kingdoms/actions/runs/39131345860); Worker `705b26bf-2802-46d6-9869-e6aceaac282c`.
- **INS-5-F1-R is USER-ACCEPTED / CLOSED** per latest design commit `ecc182c23eadf933e7fffcebbf6c6be3064af6cd`. Accepted deployment: SHA `44e7afb4435361c8fd7a5edbac0e038371481731`; Worker `2fdd9a9d-8c9d-4922-8e3d-8d5f4fcacbd4`.
- **Latest design reviewed:** `docs/UX2-refine.md` at `ecc182c23eadf933e7fffcebbf6c6be3064af6cd`, including §10.17.1.1 and §10.17.4.1. Preserve accepted H4 and the Q1–Q4 pause. Unrelated dirty files in the original checkout remain untouched.

## Exactly one current bounded task

Proceed with **`UX2-10.17.4.1-HUD4-F-SWORD-SILHOUETTE`**: refine only the small phone Weapon glyph to match the approved diagonal sword silhouette. Preserve the four fixed opponent equipment slots and their positions; verify the glyph at 390×700, 440×766 and 6/8/10-seat side-column phone layouts with occupied/empty slots. Run focused phone tests, exact-SHA CI/deployment and production smoke, then hand off **IMPLEMENTED / DEPLOYED — PENDING USER PHONE REVIEW**. At the next safe boundary, continue the BCP-1-F2 public Negation-pool review. Do not resume Q1–Q4.
