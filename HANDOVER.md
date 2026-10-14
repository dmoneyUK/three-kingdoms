# WTK UX2 — Current Handoff

Branch: `ux-v2`  
Design: `docs/UX2-refine.md`, blob `147b256740ca0db32ca6c59ada0cc5d5c8fe010b`

## Latest completed task

`UX2-8.3-INSPECTOR-LAYOUT-01` delivered at `81d015fd85408ac9e74ecc19fb23020aee24ef79`. Actions run `38532334896` passed Lint/fast tests, API tests, browser startup/room smoke, Worker deploy and production smoke. No local automated suites or authenticated device screenshots were run; user/Reviewer aggregate acceptance is pending.

## Current task

`UX2-8.4-INSPECTOR-CARD-DETAIL-01` — CI repair in progress. Feature SHA `b1c06696ed4d19c54b6adaa3ff628b89148062c1`; Actions `38533927630` Browser startup/room smoke passed, API still running, Lint failed at `app/page.tsx:910` because an explicitly assigned `role="region"` is redundant on `<section>`. Repair removes only that redundant role; push separately and await its exact-SHA CI/deployment before marking §8.4 delivered. No local automated suite runs.

Task acceptance remains: show public Equipment/Judgement details inline in the same Inspector, preserving the active Hero, selected combat target, prior skill detail and scroll offset. Back/Escape returns focus to the tapped public card and restores prior skill context; only Inspector × closes the Inspector. Keep local Hand information private, label public cards accurately, and do not alter Hand selection, submitted actions, CurrentAction or target selection. Reset nested details only when switching Inspector subject. Follow UX2 §8.4 and Checkpoint C.

Acceptance: skill → scroll → public Equipment/Judgement explanation → Back/Escape restores the same skill and scroll position; subject switch resets nested detail; local Hand info remains unchanged; no change to selected target, legal controls, action state or privacy. Update this handoff and mark §8.4 delivered/pending aggregate acceptance after the exact pushed SHA's CI/deployment result.
