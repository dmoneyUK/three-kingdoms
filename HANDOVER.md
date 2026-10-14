# WTK UX2 — Current Handoff

Branch: `ux-v2`  
Design: `docs/UX2-refine.md`, blob `147b256740ca0db32ca6c59ada0cc5d5c8fe010b`

## Latest completed task

`UX2-8.3-INSPECTOR-LAYOUT-01` delivered at `81d015fd85408ac9e74ecc19fb23020aee24ef79`. Actions run `38532334896` passed Lint/fast tests, API tests, browser startup/room smoke, Worker deploy and production smoke. No local automated suites or authenticated device screenshots were run; user/Reviewer aggregate acceptance is pending.

## Current task

`UX2-8.4-INSPECTOR-CARD-DETAIL-01` — show public Equipment and Judgement card explanations inside the same opponent Inspector, preserving the active Hero, selected combat target, prior skill detail and scroll offset. Back/Escape returns focus to the tapped public card and restores the prior skill context; only the Inspector × closes the Inspector. Keep local Hand card information in its existing private dialog, prevent public cards from being mislabeled private, and do not alter Hand selection, submitted actions, CurrentAction or target selection. Reset nested details only when switching Inspector subject. Follow UX2 §8.4 and Checkpoint C. CI-first; no local automated suite runs.

Acceptance: skill → scroll → public Equipment/Judgement explanation → Back/Escape restores the same skill and scroll position; subject switch resets nested detail; local Hand info remains unchanged; no change to selected target, legal controls, action state or privacy. Update this handoff and mark §8.4 delivered/pending aggregate acceptance after the exact pushed SHA's CI/deployment result.
