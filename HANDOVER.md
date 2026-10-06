# WTK UI / Layout — Current Handoff

Branch: `ux-v2`  
Mode: `AUTONOMOUS UI RUN`

## Latest result and CI

UX2.33 aligned proven Judgement ACTIVE scenes into a centered Source → Current Effect → target spine on 390/480px Top Row portrait, while 390×640 short safe zones retain a compact horizontal causal row. The 390×640 safe zone measured 384×218px and Stage 338×143px; browser assertions verify safe-zone/Dock containment, semantic order and centered alignment. The focused Judgement browser slice passed 7/7, targeted ESLint and `git diff --check` passed. No gameplay/projection changes. Pre-commit Actions run `37512146457` for exact remote SHA `aef847326a506f05ab04f0703b15e742cef15976` completed **success**. Reviewer acceptance is not claimed.

## Design checkpoint

Remote Design blob `530c8ec9b7ef5790b6a8bc27b694ac7b00499a6a` is unchanged. The authority/privacy baseline and §§12.0–12.9 were reviewed. The representative §12.9 matrix passes; the final gate remains open until remaining approved deltas close. Reviewer acceptance is unclaimed.

## Current task — UX2.33-JUDGEMENT-MOBILE-CAUSAL-SPINE-01

Close the completed Judgement mobile causal-flow task with this commit. Proven external-participant Top Row scenes use a centered top-to-bottom Source → Current Effect → target spine at normal portrait safe-zone heights; short safe zones use the established compact causal row to remain clear of the Dock. Preserve local-participant-in-Dock behavior, fail-closed semantic gates, Side Column and wide Top Row layouts. No gameplay or projection changes.
