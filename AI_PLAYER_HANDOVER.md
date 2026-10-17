# Smart Bot Player — Current Coding Agent Handover

Branch: \`feature/smart-bot-player\`  
Owner: **one Coding Agent** (never the Planner)  
Workflow: \`docs/AI_PLAYER_AGENT_WORKFLOW.md\`  
Design: \`docs/AI_PLAYER_DESIGN.md\`

## Current state: AWAITING DESIGN APPROVAL

- Initial design revision: \`AIP-D0\` (2026-10-17), **DRAFT**.
- Human and Planner are reviewing product decisions A–E, architecture and task order. **No implementation task is yet approved.**
- The branch was created from \`main\` at \`6743a357ef19ca930a02f7e3faa8cee843bd6a38\`; the latest inspected main deployment workflow run \`39037960303\` succeeded on that SHA. This is inherited baseline evidence, **not** AI-branch CI validation.
- Repository \`HANDOVER.md\` belongs to UX2 and **must not be touched**. Test Players remain separate from genuine bot seats.
- Documentation-only commits are ignored by the current workflow. The bot feature branch will need explicit CI coverage before implementation code is accepted.
- No game source or tests have been changed for AI Player in this bootstrap.

## Exactly one next gate — AIP-01 (NOT STARTED)

**Await human approval of \`docs/AI_PLAYER_DESIGN.md\` §§3–6 and task AIP-01.**

Once approved, on an explicitly authorized Coding Agent cycle:
1. Safely sync the branch; re-read **complete latest** design and this handover.
2. Choose exactly one \`APPROVED\` task with accepted dependencies (expected: \`AIP-01 — Bot seat identity & authorization boundary\`).
3. Update this file with bounded goal, revision, current state, actual tests, resume point, and exact CI evidence.
4. Implement and validate that task on this branch only. Stop at \`PENDING_REVIEW\` until human acceptance.

**Planner restriction:** Planner may edit **only** \`docs/AI_PLAYER_DESIGN.md\`, never this file or the UX2 \`HANDOVER.md\`.

**Coding Agent restriction:** No code before approved task; must check latest relevant branch CI before committing code; if failed, repair the failure before/with the scoped delivery. No automatic feature-branch deployment.

## Resume point

Review design decisions A–E with the human. Do not start Smart Bot implementation during design review.
