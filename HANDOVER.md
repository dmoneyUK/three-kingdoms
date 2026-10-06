# WTK UI / Layout — Current Handoff

Branch: `ux-v2`  
Mode: `AUTONOMOUS UI RUN`

## Latest result and CI

UX2.35 closed at `457e2e16750685148c64a607b7fd951df83626ce`; Actions run `37531803898` passed (`build-and-test` and `deploy`). §12.9 review on that production HEAD passed the new 19-case geometry/screenshot matrix, 189 related interaction regressions, and 58 layout/viewport regressions. Twelve fresh ACTIVE screenshots include measured geometry attachments. Reviewer acceptance is not claimed.

## Design checkpoint

Remote Design blob `530c8ec9b7ef5790b6a8bc27b694ac7b00499a6a` is unchanged and was re-read at the task boundary. §12.9 coverage includes its requested scenarios plus the direct-user additions for Oath, Bumper Harvest, exact portrait sizes, Dock/Stage separation, overflow, and fresh screenshots. No Reviewer acceptance is claimed.

## Current task — UX2.36-FINAL-UX2-VISUAL-GATE-01

Close the integration evidence on UX2.35 production HEAD `457e2e16750685148c64a607b7fd951df83626ce`: retain the representative 2/4/6/10-player and viewport/scenario matrix, measured no-overlap/no-overflow assertions, and fresh screenshots. Only final-gate test/HANDOVER evidence is in scope; no production or gameplay changes. Pre-commit gate: exact current remote SHA `457e2e1…` Actions run `37531803898` is green. Authority: Design blob `530c8ec9b7ef5790b6a8bc27b694ac7b00499a6a`, §§12.0–12.9.
