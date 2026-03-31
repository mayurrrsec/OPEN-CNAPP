# AGENTS.md

## Execution policy for this repository

When work is expected to take more than one small patch, or when implementing a feature from design through rollout, create and follow an ExecPlan in `.agent/PLANS.md` before coding.

### When to use an ExecPlan
Use an ExecPlan when any of these are true:
- The task spans multiple subsystems (API + worker + dashboard + docs).
- The task is expected to take more than ~30 minutes.
- The task modifies architecture, deployment, security, or data model.
- The task has risk of partial completion without checkpoints.

### Required flow
1. Read `.agent/PLANS.md` template.
2. Copy the template into a task-specific markdown plan (for example `docs/execplans/<name>.md`).
3. Fill every section (Goal, Scope, Steps, Validation, Rollback, Deliverables).
4. Keep the plan updated while implementing.
5. Include proof commands and outcomes in the final PR summary.

### Validation expectations
- Always run local verification commands listed in the plan.
- Mark each check as pass/fail/warn with exact command text.
- Do not claim completion without command evidence.
