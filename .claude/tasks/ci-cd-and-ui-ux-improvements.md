# CI/CD Fix + UI/UX Improvements

**Branch:** `fix/ci-cd-and-ui-ux-improvements`
**Created:** 2026-03-02
**Plan:** `.claude/plans/ancient-percolating-newt.md`

## Progress Tracking

### Phase 0: Fix CI/CD Pipeline (BLOCKING)
- [ ] 0A. Fix lint error — unused `result` in `departments.service.spec.ts:623`
- [ ] 0B. Fix E2E approvals — `type: 'STANDARD'` → `ExpenseType.OUT_OF_POCKET`
- [ ] 0C. Fix E2E budgets — response format `response.body` → `response.body.data`
- [ ] 0D. Fix E2E vouchers — `currency: 'PKR' as any` → `Currency.PKR`
- [ ] 0E. Fix E2E reports — investigate and fix root cause
- [ ] Verify: `npm run lint` passes, `npm run test -w @tpl-expense/api` passes

### Phase 1: Accessibility Improvements
- [ ] 1A. DataTable keyboard navigation (`role`, `tabIndex`, `onKeyDown`)
- [ ] 1B. Checkbox aria-labels (ApprovalQueuePage + ExpenseListPage)
- [ ] 1C. MainLayout mobile toggle accessibility (`aria-label`, `aria-expanded`)

### Phase 2: Code Consistency
- [ ] 2A. Create shared `formatCurrency` in `packages/web/src/utils/format.ts`
- [ ] 2A. Replace all 13+ local copies with shared import
- [ ] 2B. Replace emoji icons in ReportsPage with Heroicons
- [ ] 2C. Replace MainLayout inline SVGs with Heroicons

### Phase 3: UX & Bug Fixes
- [ ] 3A. Fix `URL.createObjectURL` memory leak in ExpenseCreatePage
- [ ] 3B. Add mobile responsive cards for ApprovalQueuePage
- [ ] 3C. Consolidate pagination (if shared component exists)

### Phase 4: Documentation
- [ ] 4A. Update root CLAUDE.md
- [ ] 4B. Update packages/web/CLAUDE.md
- [ ] 4C. Update packages/api/CLAUDE.md

### Final
- [ ] Commit, push, create PR

## Commits
| # | Message | Phase | Status |
|---|---------|-------|--------|
| 1 | `fix(api): resolve lint error and E2E test failures` | 0 | Pending |
| 2 | `fix(web): add accessibility improvements to tables and forms` | 1 | Pending |
| 3 | `refactor(web): consolidate formatCurrency and replace emoji/inline SVG icons` | 2 | Pending |
| 4 | `fix(web): fix blob URL memory leak and add mobile approval cards` | 3 | Pending |
| 5 | `docs: update CLAUDE.md files with new conventions` | 4 | Pending |
