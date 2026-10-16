# Current Handover

Branch: `ux-v2`

## Latest results

- **Beauty B2 implementation delivered; PENDING USER REVIEW.** Code commit `e5c57d4ad97412cbb3a152f2e5b53f6fb55d7020`; exact-SHA Actions run [38959202919](https://github.com/dmoneyUK/three-kingdoms/actions/runs/38959202919) passed lint/build/fast, API, browser startup/room smoke, deploy and production smoke. Worker version `cd04dfa2-ced7-4de9-9652-a28f59f96a9f`. Beauty uses the H4 central announcement owner; only local `.private-draw-content` is collision-protected with 10px clearance and fail-closed placement. No local tests or Beauty-specific live screenshots/DOMRects were run; CI browser coverage was startup/room smoke only. No visual acceptance is claimed. H4 and B1 also remain pending human review.
- **B3 source/API review:** the exact B2 CI API job exercised Beauty acceptance, decline, stale submit, owner Hand change, and observer JSON omitting the drawn card ID. Source review confirms per-viewer timeline filtering and private `myHand` projection. No Beauty-specific four-browser refresh/switch, reconnect, or deck-boundary scenario was run; those remain for manual user/reviewer verification. No rule/projection defect found, and no B3 acceptance is claimed.
- **U13-C delivered; PENDING USER REVIEW.** Commit `f1ef527a806842309010dbad5d837f67132a27a0`; run [38961307985](https://github.com/dmoneyUK/three-kingdoms/actions/runs/38961307985) passed API, Lint/fast, browser startup/room smoke, deploy and production smoke. Worker version `132798e8-92c9-4d1a-9882-cbc73df55841`. No local automated tests or long-name phone measurements were run.
- Latest reviewed design source: remote `ux-v2` head `f1ef527a806842309010dbad5d837f67132a27a0`, `docs/UX2-refine.md` blob `d9271cc6880514914f1aefbd0bcebe77eb39d950`. Compared with prior reviewed blob `ab49c09580f9e2d9c422bf0e7cdd6ba229bea0fa`; the only intervening design change is the B2 progress marker. Re-read §§10.13.3–10.13.4, §10.13.9, and §10.14.3; product requirements are unchanged. Preserve pre-existing untracked `HANDOVER 3.md`.

## Current bounded task

**UX2-10.13-U13-D-OPPONENT-EQUIPMENT-GLYPHS-01.** Design: §10.13.4 and §10.13.9. Replace only the compact opponent-seat horse pictogram with clear `+1` / `−1` numerals; preserve sword/shield silhouettes, sparse real-equipped-only rendering, actual equipment IDs/names, and accessible “Plus-one horse” / “Minus-one horse” labels. Keep full Inspector and real CardFaces unchanged. Make the final-effective phone badge sizing legible at 390px without changing slots, rules, range, hit targets, or card motion. Do not run local automated tests; inspect the scoped diff and rely on exact-SHA CI. After delivery mark U13-D PENDING USER REVIEW and proceed to U13-E.
