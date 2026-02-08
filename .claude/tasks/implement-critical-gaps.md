# Task: Implement Critical Backend Gaps

## Status: IN PROGRESS
## Date: 2026-02-08

## Overview
Three backend features need implementation:
1. Password Reset Flow
2. Email Notification Integration
3. PDF Report Export

## Execution Strategy
Multi-agent parallel workflow with separate feature branches:

| Feature | Branch | Agent | Status |
|---------|--------|-------|--------|
| Password Reset | `feat/password-reset` | Agent 1 | Pending |
| Email Notifications | `feat/email-notifications` | Agent 2 | Pending |
| PDF Export | `feat/pdf-export` | Agent 3 | Pending |

## Feature 1: Password Reset
- **Files**: schema.prisma, auth.module.ts, auth.service.ts, ResetPasswordPage.tsx (new), App.tsx
- **Key**: Add resetToken/resetTokenExpiry to User model, implement forgotPassword/resetPassword with hashed tokens, create frontend reset page

## Feature 2: Email Notifications
- **Files**: approvals.module.ts, approvals.service.ts, expenses.module.ts, expenses.service.ts
- **Key**: Import NotificationsModule, inject EmailService, call email methods after approve/reject/submit

## Feature 3: PDF Export
- **Files**: reports.service.ts
- **Key**: Replace generatePdf stub with real PDFKit implementation (landscape A4, tabular layout)

## Detailed Plan
See: `/Users/saadhashmi/.claude/plans/keen-mapping-iverson.md`

## Merge Order
1. feat/password-reset → main
2. feat/email-notifications → main
3. feat/pdf-export → main

## Post-Merge
- Update CLAUDE.md files
- Update session-notes.md
