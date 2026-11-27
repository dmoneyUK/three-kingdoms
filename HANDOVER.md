# HANDOVER

## Current task — §10.84 UNIVERSAL-H4-CARD-BRACKET-FORMAT-01

Design reviewed at latest remote `ux-v2` `04b0a2906ccd2d4deb8cf933131a2a41260b5fe4`; §10.84 is unchanged. Exact-SHA run `45986711040` for `303192105b20c39cccba9fc16e592be9850a65ca` passed lint/build/fast and browser startup/H4 smoke; API failed five copy assertions and deploy was skipped. Root cause: Stauchness's typed public H4 fact still emitted bare rank/suit, damage card names were accepted without a matching unique committed root-card proof, and one Burning Bridges expectation remained stale.

Correction in progress: format Stauchness rank/suit from its typed public Judgement face; restore the unique, source-matching committed `CARD_PLAYED` requirement before bracketing damage source; update the Burning Bridges physical-card H4 assertion. Preserve ordinary logs, unknown-source fallbacks, gameplay, privacy and layout.

Focused pure tests passed 75/75; committed public-outcome source-proof test passed 1/1; `git diff --check` passed. No local UI/browser/device test. One direct API-file invocation lacked the API harness and returned `ECONNREFUSED`; it is not a product test result. Correction commit/push, exact-SHA CI, deployment and production smoke remain pending. After §10.84 delivery, next authorized scope is §10.79 title-only; Owner iPhone review remains required.
