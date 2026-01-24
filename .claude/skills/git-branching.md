# Git Branching Strategy Skill

Simple branching strategy for TPL Expense project (small-medium team).

## Branch Structure

```
main                    # Production-ready code, always stable
└── feature/*          # Feature development branches
└── fix/*              # Bug fix branches
└── hotfix/*           # Urgent production fixes
```

## Branch Naming Convention

```
feature/day1-auth-setup
feature/expense-submission
feature/ocr-integration
fix/login-validation-bug
hotfix/security-patch
```

Format: `{type}/{short-description}`

## Workflow

### Starting New Work

```bash
# Always start from latest main
git checkout main
git pull origin main

# Create feature branch
git checkout -b feature/my-feature-name
```

### During Development

```bash
# Commit frequently with clear messages
git add -A
git commit -m "Add user authentication endpoint"

# Push to remote regularly (hourly recommended)
git push -u origin feature/my-feature-name
```

### Completing a Feature

```bash
# Ensure branch is up to date with main
git checkout main
git pull origin main
git checkout feature/my-feature-name
git merge main

# Resolve any conflicts, then push
git push origin feature/my-feature-name

# Create Pull Request on GitHub
gh pr create --title "Add user authentication" --body "..."
```

### After PR Approval

```bash
# Merge via GitHub PR (squash or merge commit)
# Then clean up local branch
git checkout main
git pull origin main
git branch -d feature/my-feature-name
```

## Commit Message Format

```
<type>: <short description>

[optional body explaining what and why]

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
```

### Types
- `feat:` New feature
- `fix:` Bug fix
- `refactor:` Code restructuring
- `docs:` Documentation
- `test:` Adding tests
- `chore:` Maintenance tasks

### Examples
```
feat: Add JWT authentication with refresh tokens

- Implement login/logout endpoints
- Add session timeout (5 minutes)
- Single session per user enforcement

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
```

```
fix: Correct expense submission deadline calculation

The deadline was calculating weekends incorrectly.
Now properly skips to next business day.

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
```

## Current Branch Status

To check where you are:
```bash
git branch -a      # List all branches
git status         # Current branch and changes
git log --oneline -5  # Recent commits
```

## Quick Reference

| Task | Command |
|------|---------|
| Create feature branch | `git checkout -b feature/name` |
| Push branch | `git push -u origin feature/name` |
| Update from main | `git merge main` |
| Create PR | `gh pr create` |
| Delete local branch | `git branch -d feature/name` |
| Delete remote branch | `git push origin --delete feature/name` |

## Rules

1. **Never push directly to main** - Always use PRs
2. **Keep branches short-lived** - Merge within 1-2 days
3. **One feature per branch** - Don't mix unrelated changes
4. **Pull before push** - Stay in sync with team
5. **Commit hourly** - Don't lose work
