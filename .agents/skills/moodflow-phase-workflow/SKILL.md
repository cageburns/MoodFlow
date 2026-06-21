# MoodFlow Phase Workflow

Use this skill for project work in this repository when a task belongs to a defined MoodFlow project phase or role-based workflow.

## Required Context

Before doing any project work:

1. Read every file in `docs/`.
2. Identify the current project phase from the documentation and user request.
3. Identify the acceptance criteria for that phase.
4. Identify the active role for the task: `implementer`, `tester`, or `reviewer`.
5. If the phase, acceptance criteria, or active role cannot be determined, ask the user for the missing information before editing files.

## Phase Discipline

Work on one project phase at a time.

- Keep all analysis, file changes, tests, and review comments scoped to the assigned phase.
- Do not start work for a later phase.
- Do not backfill unrelated earlier-phase work unless it blocks the assigned phase.
- Avoid unrelated refactors, formatting churn, dependency changes, or documentation edits.

## Role Rules

### Implementer

As implementer:

- Confirm the assigned phase and acceptance criteria.
- List the planned file changes before editing.
- Make only the changes required to satisfy the phase acceptance criteria.
- Run relevant tests, checks, or build commands.
- Compare the completed work against the acceptance criteria.
- Update `docs/ai-development-log.md` with a concise entry describing the work, checks run, and acceptance-criteria status.
- Stop after implementation work for the assigned phase is complete.

### Tester

As tester:

- Confirm the assigned phase and acceptance criteria.
- List the planned files or test assets to inspect or change before editing.
- Create or update only tests and test-support files needed to verify the assigned phase.
- Run relevant tests or checks.
- Compare observed behavior with the acceptance criteria.
- Update `docs/ai-development-log.md` with a concise entry describing test coverage, results, and any gaps.
- Stop after testing work for the assigned phase is complete.

### Reviewer

As reviewer:

- Confirm the assigned phase and acceptance criteria.
- Review only changes relevant to the assigned phase.
- Prioritize bugs, behavioral regressions, missing tests, and acceptance-criteria gaps.
- Do not edit files unless the user explicitly asks for review fixes.
- Run relevant checks when needed to validate findings.
- Compare the reviewed result with the acceptance criteria.
- Update `docs/ai-development-log.md` with a concise entry describing the review outcome, checks run, and unresolved risks.
- Stop after review work for the assigned phase is complete.

## Before Editing

Before creating, modifying, moving, or deleting files:

- State the assigned phase.
- State the active role.
- State the acceptance criteria being targeted.
- List planned file changes.

If new information changes the plan, list the revised planned file changes before continuing.

## Verification

After work is complete:

- Run the most relevant available tests, checks, builds, or lint commands for the changed scope.
- If a check cannot be run, record why.
- Compare the final result directly against the phase acceptance criteria.
- Do not claim completion for criteria that were not verified.

## Development Log

Every role must update `docs/ai-development-log.md` before stopping.

The log entry should include:

- Date.
- Phase.
- Role.
- Summary of work or review.
- Files changed or inspected.
- Tests or checks run.
- Acceptance-criteria result.
- Follow-up items, if any.

## Stop Condition

Stop after the assigned role is complete.

Do not continue into another role, another phase, or unrelated cleanup unless the user explicitly assigns that next task.
