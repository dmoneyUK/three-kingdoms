# Current Handover

Branch: `ux-v2`

## Latest relevant result

- U13-E/F §10.13.5.1 technical delivery is complete at `346b5f0df50f8cbbd44b13dd787e4c3c50ea6188`. Exact-SHA Actions run `39057243087` passed lint/fast, API, browser startup smoke, build, migrations, Worker deploy and production smoke; Worker version `e643dff4-d028-416a-8177-e6ee6c673f8e`. Production Test Switch replay covered LUST root reveal/move/park, two Attack responses, Skip/settlement and four viewer perspectives at 390×700, 390×844, 440×894 and 480×900. Full accessible participant names and public proof order were consistent. This delivery is pending user phone review; accepted H4 was unchanged. Details are in `docs/AUTONOMOUS_UI_ROADMAP.md`.
- H2-G1-NAME-F local reproduction measured the production name scrim at 28.8125px in both required four-seat viewports, caused by the legacy mobile `top: 60%` remaining active while the final rule set `bottom: 0`. A final-effective CSS override now clears that top constraint; local measurements are 13px at 390×700/440×894 and 16.5px at 6/8/10 side seats. Focused browser coverage passes 5/5 with long Latin/Chinese names, accessible full-name checks, HP/SWITCH/status clearance and stage/H4 safe-zone clearance. `npm run build`, focused ESLint and `git diff --check` pass. Screenshots/geometry: `/tmp/wtk-h2g1-name-f/`.
- Q1–Q4 remain deferred by the current plan. H4-A/B/C remains user-accepted and unchanged. H2-G1 overall remains not accepted due to separate existing portrait Inspect feedback; this task only fixes name-bar height.

## Exactly one current bounded task

**UX2-10.8.2.2-H2-G1-NAME-F — exact-SHA delivery and production comparison.** Commit and push the one-row name-scrim CSS plus focused browser regression. Verify exact-SHA Actions/deployment, then repeat the production Test Switch measurements/screenshots at 390×700 and 440×894. Keep full accessible names and verify the bar remains one line, clears status/HP/SWITCH, and stays outside the stage/H4 safe zone. Mark this slice pending user phone review; do not change H4, Q1–Q4, JSX, gameplay or the separate Inspect interaction. Reviewed design: `docs/UX2-refine.md` at `ea62fc8`, §10.8.2.2 and the 2026-10-17 short-cycle priority override.
