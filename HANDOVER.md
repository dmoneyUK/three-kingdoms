# WTK UI / Layout — Current Handoff

Branch: `ux-v2`  
Mode: `USER-DIRECTED UX REFINEMENT`

## Latest result / CI

§6.32 process-tree profile preserved all tests and measured a two-group API runner: 266/266 across the same 24 files, 1,688 MiB peak tree RSS and 54.92s versus 2,266–2,278 MiB and ~50s with four groups. Build/fast/browser-smoke passed; local Node 26 ESLint produced a V8 heap OOM, while the latest required Actions run on base SHA `b84779c` passed all jobs and deploy in 3m07s. The runner change's own Actions result is pending after push. Detailed measurements are in the Roadmap.

## Design checkpoint

Reviewed current `docs/UX2-refine.md` blob `1108283e8ea2cef240a324daf939d1eec94a5029`, including the intervening design changes in remote commits `2fdd4ae` and `b25e82a`. §6.34 Stage A is the next authorized slice; §6.31 user visual acceptance remains open.

## Current task

`UX2-6.34-STAGE-A-CENTRED-ATTACK-DODGE-01` — measure actual Hand CardFace dimensions and usable battle-field obstructions; refine the existing production Attack/Dodge layout to shared hand-size-or-smaller cards and a centre-balanced composition, without changing causal proof, response timing, controls or privacy. Prove 4-player Attack, private selected Dodge and committed Dodge for top→local, local→top and top→top at 390×844, ~440px, 480×900 and wide, with server-backed screenshots and measured card/union/anchor geometry. Preserve root position within 1px when geometry is unchanged. Stop after Stage A for user visual acceptance; do not begin Stages B/C.
