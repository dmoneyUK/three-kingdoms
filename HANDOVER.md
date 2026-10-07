# WTK UI / Layout — Current Handoff

Branch: `ux-v2`  
Mode: `AUTONOMOUS UI RUN`

## Latest result and CI

`UX2.REFINE-OTHER-PLAYER-INSPECT-IDENTITY-BLOCK-01` implements §4B.4. At
390×844, portrait/identity widths are 132.8/191.2px (39.8%/57.2% of the
334px Inspect content width); at 480×900, 169.7/244.3px (40.0%/57.6% of
424px). Identity type is 15/12/10/9px; the wide portrait remains 90×113px.
Shells measured 352×197, 442×232, and 680×230px; overlap with Menu, Guidance,
and Dock was 0 and Dock delta was 0px. Focused Inspect browser spec passed
7/7; targeted ESLint and `git diff --check` passed. Reviewer acceptance is not
claimed.

Commit gate on remote base SHA `5cc2938509982f3fd4844e8d1ad2558f7c4f4223`:
Actions #849 (`37618977420`) completed `success` on that exact SHA. The
identity-block task is locally validated; its CI will start after push.

## Design checkpoint

Remote `docs/UX2-refine.md` blob `6889c2541f32fe6b4825aadd652b5ade52a6ae39`
was unchanged at this task boundary; §4B.5 and §4B.10 were re-read for the
next task. §4B.2–4B.4 are complete. §5 still defers Interaction Stage
Hero/Player refactoring until all active pre-§5 refinements are closed.

## Next task

`UX2.REFINE-OTHER-PLAYER-INSPECT-PUBLIC-SKILLS-01` — implement only §4B.5:
readable compact public-skill chips, a content-sized single-skill block, and a
compact `None` state. Validate one-skill (`targetHero=xiahou-dun`) and multiple-
skill fixtures at 390×844, 480×900, and wide. Do not change skill authority,
Inspect identity/shell geometry, other public zones, privacy, or Dock behavior.
