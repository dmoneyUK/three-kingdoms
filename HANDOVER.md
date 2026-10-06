# WTK UI / Layout — Current Handoff

Branch: `ux-v2`  
Mode: `AUTONOMOUS UI RUN`

## Latest result and CI

UX2.31 added Fanjian source-owned Selectable Detail browser proof and corrected a real wide-screen Dock overlap by scaling shared detail cards to 68×96px above 650px; mobile card sizing is unchanged. The target-card browser suite passed 40/40, `room-safety-render` passed 19/19, targeted ESLint and `git diff --check` passed. Selection remains anonymous/local until Confirm, submits the existing `trigger` payload once, resets on action revision, and retains the picker without source-focus proof. No gameplay/projection changes. Pre-commit Actions run `37508298620` for exact remote SHA `f2801a81cffb800f023059e49c885fca80a165fb` completed **success**. Reviewer acceptance is not claimed.

## Design checkpoint

Remote Design blob `530c8ec9b7ef5790b6a8bc27b694ac7b00499a6a` is unchanged. The authority/privacy baseline and §§12.0–12.9 were reviewed. The representative §12.9 matrix passes; the final gate remains open until remaining approved deltas close. Reviewer acceptance is unclaimed.

## Current task — UX2.32-KIRIN-BOW-SELECTABLE-DETAIL-BROWSER-PROOF-01

Add focused browser proof for Kirin Bow's existing `target_cards` option against a damaged opponent's publicly identified Mount. Verify the projected target appears as Selectable Detail only with proven external focus, public Equipment identity is individually selectable, selection stays local until Confirm, the existing `trigger` payload is submitted once, and action-revision changes clear it. Retain the generic picker if focus/public-card proof is absent. Do not change gameplay or invent semantic projection; record an exact authority gap if the runtime scene cannot prove the relationship.
