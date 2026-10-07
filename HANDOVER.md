# WTK UI / Layout — Current Handoff

Branch: `ux-v2`  
Mode: `AUTONOMOUS UI RUN`

## Latest result and CI

Task 8 implementation is at `c726c8cb23b40ac72911d77ec79d1e840cdb6408`. Actions run `37556346455` (#812) failed on Zhuge's 320×640 label; repair `150ff542b270f122c0711307ed33331629326592` then failed run `37557990410` (#817) on Diao Chan's `Beauty Outshining the Moon`. Latest remote SHA `c97c82481b6e0520bdbd92b6c8b4de95711ffcaa` also failed run `37559075517` (#819): lint/build passed, browser tests were 673/674, same Diao Chan label at three lines. The condensed-font fallback repair passes focused local browser validation 2/2; Linux CI validation is pending.

## Design checkpoint

Last fully reviewed `docs/UX2-refine.md` blob `9f8663afea206be9350153164c2c38e84d54823e`, including the 320px skill-label requirements (§1.3, §1.9, §4.7–4.8). Remote design has since advanced to blob `7e021455c8fdc9e88dc1b3b20d036400da82be44`; complete its reread after the repair SHA's CI succeeds and before resuming design work.

## Current task

`CI-REPAIR-QUEUE-AND-320PX-HERO-SKILL-LABELS-01` — preserve the meaningful two-line natural-wrap assertion and make the 320×640 layout pass across the implemented Hero roster. Latest run #819 failed on Diao Chan; commit only the condensed-font fallback and truthful handoff update, then wait for that repair SHA's Actions result. Once green, re-read the latest design and resume `UX2.REFINE-NEGATION-SETTLEMENT-STAGE-01` from the current Reviewer handoff; follow the latest sequencing rule before starting UX3.
