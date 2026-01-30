# Hook: Session Start

## Trigger
At the beginning of each Claude Code session.

## Purpose
Establish context, understand current state, and plan the session effectively.

---

## Session Startup Checklist

### 1. Load Context

```bash
# Read root CLAUDE.md
cat CLAUDE.md

# Check current feature state
cat .claude/state/project-state.json

# Read last session notes
cat .claude/state/session-notes.md
```

### 2. Understand Current State

Ask yourself:
- [ ] What feature am I working on?
- [ ] What was completed last session?
- [ ] What are the next steps?
- [ ] Are there any blockers noted?

### 3. Verify Environment

```bash
# Check git status
git status

# Current branch
git branch --show-current

# Any uncommitted changes?
git diff --stat
```

### 4. Check Dependencies

```bash
# Ensure node_modules is current
npm install

# Verify build works
npm run build -w @tpl-expense/api
```

### 5. Run Health Check

```bash
# Quick test run
npm run test -w @tpl-expense/api -- --onlyChanged

# Start dev server (if needed)
npm run dev:api
```

---

## Context Loading Priority

Load context in this order (minimal context budget):

1. **Root CLAUDE.md** (always) - ~500 tokens
2. **Current feature state** (always) - ~300 tokens
3. **Last session notes** (always) - ~400 tokens
4. **Active module files** (if known)
5. **Relevant skill files** (as needed)

---

## Quick Start Commands

```bash
# One-liner to check project state
git status && cat .claude/state/session-notes.md | head -30

# Start development environment
docker-compose up -d && npm run dev:api

# Verify everything works
npm run test -w @tpl-expense/api -- --onlyChanged
```

---

## Session Start Announcement

When starting, Claude should briefly state:

```
Starting session. Loading context...

Current state:
- Branch: feature/expense-submission
- Feature: Expense submission flow
- Last session: Completed receipt upload, tests passing
- Next: Implement OCR integration

Plan:
1. Read ocr-integration.md skill
2. Implement OCR service
3. Write tests
4. Update CLAUDE.md

Ready to proceed.
```
