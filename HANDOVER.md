# WTK UI / Layout — Current Handoff

Branch: `ux-v2`  
Mode: `AUTONOMOUS UI RUN`

## Latest result and CI

`UX2.18-AOE-STRUCTURAL-COMPOSITION-01` is implemented locally: typed Group/AOE now renders one proven Source → root action card → Group Target Strip, with the current participant shown only in the strip and submitted public Negation cards attached as a compact branch. The separate Hero Focus, Medium Participant Card, Current Effect panel, repeated event sentence, AOE heading, and per-target Hero/HP details are absent in this composition. Focused browser coverage passed 30/30; targeted ESLint and `git diff --check` passed. Before this task commit, remote SHA `c9f6afe25867e9d849aa8f8d33833370ece5e86d` had push-triggered Actions run `37462834224` **success**. CI for the task commit has not yet been observed.

## Design checkpoint

Reviewed the complete latest remote Design, blob `530c8ec9b7ef5790b6a8bc27b694ac7b00499a6a`, unchanged from the previous checkpoint. §12.6 structural convergence is implemented for the existing typed Group contract; the full plan still identifies partial ACTIVE families, authority-dependent projections, SELECTABLE DETAIL, and the final visual gate.

## Next task — UX2.19-MULTI-TARGET-STRATAGEM-AUTHORITY-AUDIT-01 (READY)

Audit Oath of the Peach Garden and Bumper Harvest from rule/domain execution through public causal and PresentationV2/Snapshot/Client projections. For each, map the authoritative source, public root identity, affected participant set/order, any active participant/status, public Negation behavior, and viewer-private choice/legal-action data. Determine whether an existing typed projection suffices or what server-owned public contract is missing. This is an audit only: do not change game rules, Pending, projection protocol, React, or CSS. Keep Oath and Bumper Harvest semantically distinct; in particular, do not infer Oath targets in React or expose Bumper Harvest private choice state. Cite exact functions/types/tests and recommend one separately bounded authoritative-projection task. Stop and request a product decision if the target-set timing or public/private ownership cannot be resolved from existing rules and server state.
