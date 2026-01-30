# Agent Dependencies Configuration

## Agent Dependency Graph

```yaml
agents:
  backend-engineer:
    description: "Full-stack backend development"
    depends_on: []
    outputs_to:
      - frontend-engineer  # API contracts
      - qa-engineer        # Endpoints to test
      - documentation      # API docs source
    can_run_parallel_with:
      - frontend-engineer  # If API contracts are pre-defined

  frontend-engineer:
    description: "Full-stack frontend development"
    depends_on:
      - backend-engineer   # Needs API contracts
    outputs_to:
      - qa-engineer        # Components to test
      - documentation      # Component docs
    can_run_parallel_with:
      - backend-engineer   # If API contracts are pre-defined

  qa-engineer:
    description: "Integration and E2E testing"
    depends_on:
      - backend-engineer   # Must have working API
      - frontend-engineer  # Must have working UI
    outputs_to:
      - code-reviewer      # Test results
    can_run_parallel_with: []

  code-reviewer:
    description: "Code quality review"
    depends_on:
      - qa-engineer        # Tests must pass first
    outputs_to:
      - documentation      # Approved code
      - devops-engineer    # If deployment needed
    can_run_parallel_with: []

  documentation:
    description: "Documentation maintenance"
    depends_on:
      - code-reviewer      # Code must be approved
    outputs_to: []
    can_run_parallel_with:
      - devops-engineer

  devops-engineer:
    description: "Infrastructure and deployment"
    depends_on:
      - code-reviewer      # Code must be approved
    outputs_to: []
    can_run_parallel_with:
      - documentation
```

## Feature Type Templates

### Full-Stack Feature (e.g., expense-submission)

```yaml
feature_type: full_stack
execution_plan:
  phase_1:
    name: "Core Development"
    parallel: true
    tasks:
      - agent: backend-engineer
        task_id: "{feature}-backend"
        inputs: [requirements, domain-skill]
        outputs: [api-contracts, services]

  phase_2:
    name: "Frontend Development"
    parallel: false
    tasks:
      - agent: frontend-engineer
        task_id: "{feature}-frontend"
        inputs: [api-contracts, design-requirements]
        outputs: [components, pages, rtk-hooks]

  phase_3:
    name: "Quality Assurance"
    parallel: false
    tasks:
      - agent: qa-engineer
        task_id: "{feature}-qa"
        inputs: [backend-output, frontend-output]
        outputs: [integration-tests, e2e-tests, bugs]

  phase_4:
    name: "Review & Document"
    parallel: true
    tasks:
      - agent: code-reviewer
        task_id: "{feature}-review"
        inputs: [all-code, test-results]
        outputs: [review-verdict, issues]

  phase_5:
    name: "Finalize"
    parallel: true
    tasks:
      - agent: documentation
        task_id: "{feature}-docs"
        inputs: [approved-code, api-contracts]
        outputs: [updated-docs, changelog]
```

### Backend-Only Feature

```yaml
feature_type: backend_only
execution_plan:
  phase_1:
    tasks:
      - agent: backend-engineer
        task_id: "{feature}-backend"

  phase_2:
    tasks:
      - agent: qa-engineer
        task_id: "{feature}-qa"
        scope: integration_only

  phase_3:
    parallel: true
    tasks:
      - agent: code-reviewer
        task_id: "{feature}-review"
      - agent: documentation
        task_id: "{feature}-docs"
```

### Bug Fix

```yaml
feature_type: bugfix
execution_plan:
  phase_1:
    tasks:
      - agent: backend-engineer OR frontend-engineer
        task_id: "{bugfix}-fix"

  phase_2:
    tasks:
      - agent: qa-engineer
        task_id: "{bugfix}-qa"
        scope: regression_test

  phase_3:
    tasks:
      - agent: code-reviewer
        task_id: "{bugfix}-review"
```

## Handoff Data Specifications

### Backend → Frontend Handoff

```typescript
interface BackendToFrontendHandoff {
  api_contracts: {
    base_url: string;
    endpoints: Array<{
      method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
      path: string;
      description: string;
      request_dto?: string;
      response_dto: string;
      auth_required: boolean;
    }>;
    dto_definitions: Record<string, {
      fields: Record<string, string>;
      validation_rules?: string[];
    }>;
  };

  entity_interfaces: Record<string, {
    fields: string[];
    relationships: string[];
  }>;

  enums: Record<string, string[]>;
}
```

### All → Code Reviewer Handoff

```typescript
interface ToCodeReviewerHandoff {
  files_to_review: Array<{
    path: string;
    change_type: 'added' | 'modified' | 'deleted';
    lines_changed: number;
  }>;

  test_results: {
    unit: { passed: number; failed: number };
    integration: { passed: number; failed: number };
    coverage: string;
  };

  requirements_met: string[];
  known_limitations: string[];
}
```

## Conflict Resolution

### When Agents Disagree

1. **Backend vs Frontend on API Design**
   - Backend engineer's output is authoritative for API structure
   - Frontend engineer can request changes via orchestrator

2. **QA vs Developer on Bug Severity**
   - QA engineer's severity assessment is authoritative
   - Developer can dispute with evidence

3. **Reviewer vs Developer on Code Quality**
   - Critical/Major issues must be fixed
   - Minor/Suggestions are developer's choice

## Performance Optimization

### Parallel Execution Opportunities

| Scenario | Parallel Tasks | Requirement |
|----------|---------------|-------------|
| New full-stack feature | Backend + Frontend | Pre-defined API spec |
| Multiple independent features | All backend tasks | Different modules |
| Post-review phase | Documentation + DevOps | Review approved |

### Sequential Requirements (Cannot Parallelize)

| Task A | Task B | Reason |
|--------|--------|--------|
| Backend | Frontend | Frontend needs API contracts |
| Backend + Frontend | QA | QA needs working system |
| QA | Code Review | Review needs test results |
