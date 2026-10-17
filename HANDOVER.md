# Current Handover

Branch: `ux-v2`

## Latest results

- **U13-G §10.13.7 is technically delivered** at `325cf7f67a1cc8960bba96bb825ec9007052fec8`. Focused Inspector browser coverage passed **42/42**; exact-SHA Actions run [39062564475](https://github.com/dmoneyUK/three-kingdoms/actions/runs/39062564475) passed lint/fast, API, browser startup smoke, D1 migrations, Worker deploy and production smoke. Worker version: `58f7e094-af7d-4b27-a19f-57ab0518f921`. The 2+4 public-zone row was checked at 390×700, 390×844, 440×894 and 480×900 across 4/6/8/10 seats. This is pending user phone review; details are in `docs/AUTONOMOUS_UI_ROADMAP.md`.
- **U13-B-F §10.13.2.1 privacy audit found no safe public waiter.** A focused isolated Worker/D1 reproduction compared four authenticated viewers with no eligible Basic card against one eligible Basic card. No-Basic advanced to the next turn; with a Basic card, the shared public phase/status changed to `response` / `Resolving…`, and the public `log` and `timeline` exposed “may use Dauntless” to all viewers. The public `PresentationSnapshot` had no decision actor/stage; only Yue Jin's private `CurrentAction` contained the trigger option. The opportunity notice is therefore correlated with private Basic-card availability. No code was changed. Evidence and limits are in the roadmap.
- Q1/Q2 remain completed technical work; the user has paused Q3/Q4. H4-A/B/C remains user-accepted and unchanged. U13-F remains NO CHANGE: existing 390×844 Attack→Dodge evidence shows H4 intersects the revealed card by 11px; extra vertical padding enlarges the band.
- Latest remote design reviewed: `origin/ux-v2:docs/UX2-refine.md`, blob `f5553186d2c15eba0aa03f5cb9c8d91436a15e0e`.

## Exactly one current bounded task

**BLOCKED — USER INPUT REQUIRED — UX2-10.13.2.1-U13-B-F-PUBLIC-WAIT-CONTRACT-01.** The approved design says not to publish an actor when the wait's existence reveals hidden Basic-card availability, and requires a server-authoritative privacy contract review at this boundary. Choose whether to (A) preserve privacy, keep the neutral public status and defer the named-wait improvement (recommended), or (B) authorize a revised server contract that makes a public turn-end signal independent of hidden Basic-card availability. Do not change the shared status or public trigger notice until this choice is resolved. Q3/Q4 remain paused; H4 stays unchanged.
