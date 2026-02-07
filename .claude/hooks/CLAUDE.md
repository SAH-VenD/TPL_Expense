# Hooks Reference

These are **documentation guides**, not executable shell scripts. Each hook file describes a workflow that Claude should **read and follow** at a specific trigger point during a development session. They contain checklists, best practices, and recommended commands -- but the files themselves are never run as scripts.

---

## Hook Index

| File | Trigger | Description |
|------|---------|-------------|
| `session-start.md` | Beginning of every Claude Code session | Load project context, verify environment, check dependencies, and plan the session |
| `session-end.md` | Before ending a Claude Code session | Commit all work, push to remote, update session notes and feature state for next session |
| `pre-commit.md` | Before any `git commit` | Run TypeScript compilation, linting, formatting, and changed-file unit tests |
| `post-feature.md` | After completing a feature (code written, tests passing) | Update CLAUDE.md files, state files, documentation; clean up code and verify tests |
| `self-review.md` | Before creating a PR or requesting code review | Self-check for code quality, naming, error handling, security, and test coverage |
| `pre-push.md` | Before any `git push` | Full quality gate: all pre-commit checks plus full test suite, build verification, and migration status |
| `on-error.md` | When any error or failure occurs | Systematic error classification, diagnosis protocol, and resolution guides for common error types |

---

## Mandatory vs Optional Hooks

### Mandatory (must always be followed)

- **`session-start.md`** -- Required at the beginning of every session to establish context and verify the environment is healthy.
- **`session-end.md`** -- Required before ending any session to preserve context and ensure no work is lost.
- **`pre-commit.md`** -- Required before every git commit to enforce code quality standards.
- **`on-error.md`** -- Required whenever an error occurs to ensure systematic diagnosis rather than guesswork.

### Contextual (follow when the trigger condition is met)

- **`post-feature.md`** -- Follow after completing a feature implementation. Not needed for partial work or WIP commits.
- **`self-review.md`** -- Follow before creating a pull request. Not needed for local-only commits.
- **`pre-push.md`** -- Follow before pushing to remote. Includes all pre-commit checks plus additional build and test verification.

---

## Workflow Lifecycle

The hooks follow a natural development lifecycle order. During a typical session, they are encountered in this sequence:

```
session-start
     |
     v
   work  <----+
     |         |
     v         |
 pre-commit    |
     |         |
     v         |
 (more work?) -+
     |
     v
 post-feature
     |
     v
 self-review
     |
     v
  pre-push
     |
     v
 session-end
```

**Notes:**
- The `pre-commit` step repeats for every commit during the session.
- The `on-error` hook can be triggered at **any point** in the lifecycle and is not shown in the linear flow above.
- Not every session reaches `post-feature` -- some sessions involve incremental work committed as WIP.
- `self-review` and `pre-push` are only reached when work is ready to leave the local machine.
