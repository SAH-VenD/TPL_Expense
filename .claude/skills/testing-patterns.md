# Skill: Testing Patterns

## Context
This skill contains the testing conventions, patterns, and best practices for the expense automation project. Reference this when writing any tests - unit, integration, or E2E.

---

## Testing Stack

| Type | Framework | Location |
|------|-----------|----------|
| Unit Tests (Backend) | Jest | `packages/api/src/**/__tests__/*.test.ts` |
| Unit Tests (Frontend) | Jest + React Testing Library | `packages/web/src/**/*.test.tsx` |
| Integration Tests | Jest + Supertest | `packages/api/src/**/__tests__/*.integration.test.ts` |
| E2E Tests | Playwright | `e2e/tests/**/*.spec.ts` |

---

## Coverage Requirements

| Type | Minimum Coverage |
|------|------------------|
| Backend Services | 80% |
| Backend Controllers | 70% |
| Frontend Components | 70% |
| Critical Paths | 100% |

---

## Test File Naming

```
# Unit tests
*.test.ts           # Backend
*.test.tsx          # Frontend/React

# Integration tests
*.integration.test.ts

# E2E tests
*.spec.ts

# Test utilities
*.mock.ts           # Mock implementations
*.factory.ts        # Test data factories
*.fixture.ts        # Static test data
```

---

## Backend Unit Tests

### Service Test Pattern (with Prisma)

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { ExpensesService } from './expenses.service';
import { PrismaService } from '@/common/prisma/prisma.service';
import { createMockExpense, createMockUser } from '@/test/factories';

describe('ExpensesService', () => {
  let service: ExpensesService;
  let prisma: jest.Mocked<PrismaService>;

  // Mock Prisma service
  const mockPrisma = {
    expense: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ExpensesService,
        {
          provide: PrismaService,
          useValue: mockPrisma,
        },
      ],
    }).compile();

    service = module.get<ExpensesService>(ExpensesService);
    prisma = module.get(PrismaService);

    // Clear all mocks before each test
    jest.clearAllMocks();
  });

  describe('create', () => {
    const createDto = {
      amount: 100,
      currency: 'PKR',
      categoryId: 'cat-123',
      description: 'Test expense',
    };
    const userId = 'user-123';

    it('should create an expense with DRAFT status', async () => {
      const mockExpense = createMockExpense({ ...createDto, userId });
      mockPrisma.expense.create.mockResolvedValue(mockExpense);

      const result = await service.create(userId, createDto);

      expect(mockPrisma.expense.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          ...createDto,
          userId,
          status: 'DRAFT',
        }),
      });
      expect(result.status).toBe('DRAFT');
    });

    it('should throw BadRequestException for negative amount', async () => {
      await expect(
        service.create(userId, { ...createDto, amount: -100 })
      ).rejects.toThrow('Amount must be positive');
    });

    it('should throw BadRequestException for invalid currency', async () => {
      await expect(
        service.create(userId, { ...createDto, currency: 'INVALID' })
      ).rejects.toThrow('Currency is not supported');
    });
  });

  describe('findOne', () => {
    it('should return expense when found and user is owner', async () => {
      const expense = createMockExpense({ userId: 'user-123' });
      mockPrisma.expense.findUnique.mockResolvedValue(expense);

      const result = await service.findOne('expense-123', 'user-123');

      expect(result).toEqual(expense);
    });

    it('should throw NotFoundException when expense not found', async () => {
      mockPrisma.expense.findUnique.mockResolvedValue(null);

      await expect(
        service.findOne('expense-123', 'user-123')
      ).rejects.toThrow('Expense not found');
    });

    it('should throw ForbiddenException when user is not owner', async () => {
      const expense = createMockExpense({ userId: 'other-user' });
      mockPrisma.expense.findUnique.mockResolvedValue(expense);

      await expect(
        service.findOne('expense-123', 'user-123')
      ).rejects.toThrow('You can only access your own expenses');
    });
  });

  describe('submit', () => {
    it('should change status from DRAFT to PENDING_APPROVAL', async () => {
      const expense = createMockExpense({
        status: 'DRAFT',
        userId: 'user-123',
        receipts: [{ id: 'receipt-1' }],
      });
      mockPrisma.expense.findUnique.mockResolvedValue(expense);
      mockPrisma.expense.update.mockResolvedValue({ ...expense, status: 'PENDING_APPROVAL' });

      const result = await service.submit('expense-123', 'user-123');

      expect(result.status).toBe('PENDING_APPROVAL');
      expect(mockPrisma.expense.update).toHaveBeenCalled();
    });

    it('should throw BadRequestException when no receipts attached', async () => {
      const expense = createMockExpense({
        status: 'DRAFT',
        userId: 'user-123',
        receipts: [],
      });
      mockPrisma.expense.findUnique.mockResolvedValue(expense);

      await expect(
        service.submit('expense-123', 'user-123')
      ).rejects.toThrow('At least one receipt is required');
    });
  });
});
```

### Controller Test Pattern

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { ExpensesController } from './expenses.controller';
import { ExpensesService } from './expenses.service';
import { createMockExpense, createMockUser } from '@/test/factories';
import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';

describe('ExpensesController', () => {
  let controller: ExpensesController;
  let service: jest.Mocked<ExpensesService>;

  const mockService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    submit: jest.fn(),
    delete: jest.fn(),
  };

  const mockUser = createMockUser({ id: 'user-123' });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ExpensesController],
      providers: [
        { provide: ExpensesService, useValue: mockService },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<ExpensesController>(ExpensesController);
    service = module.get(ExpensesService);

    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create expense and return ExpenseResponseDto', async () => {
      const createDto = { amount: 100, currency: 'PKR', categoryId: 'cat-1' };
      const expense = createMockExpense({ ...createDto, userId: mockUser.id });
      mockService.create.mockResolvedValue(expense);

      const result = await controller.create(mockUser, createDto);

      expect(mockService.create).toHaveBeenCalledWith(mockUser.id, createDto);
      expect(result.id).toBe(expense.id);
      expect(result.amount).toBe(expense.amount);
    });
  });
});
```

---

## Backend Integration Tests

### API Integration Test Pattern

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '@/app.module';
import {
  setupTestDatabase,
  cleanupTestDatabase,
  createTestUser,
  getAuthToken,
  seedTestData,
} from '@/test/helpers';

describe('Expenses API (Integration)', () => {
  let app: INestApplication;
  let authToken: string;
  let testUser: User;
  let testCategory: Category;

  beforeAll(async () => {
    // Create test module with real database
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();

    // Apply same pipes/filters as production
    app.useGlobalPipes(new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }));

    await app.init();

    // Setup test data
    await setupTestDatabase();
    const { users, categories } = await seedTestData();
    testUser = users.find(u => u.role === 'employee');
    testCategory = categories[0];
    authToken = await getAuthToken(app, testUser);
  });

  afterAll(async () => {
    await cleanupTestDatabase();
    await app.close();
  });

  describe('POST /api/v1/expenses', () => {
    const validExpenseData = {
      amount: 1500.50,
      currency: 'PKR',
      categoryId: '', // Set in beforeEach
      description: 'Integration test expense',
      expenseDate: new Date().toISOString(),
    };

    beforeEach(() => {
      validExpenseData.categoryId = testCategory.id;
    });

    it('should create expense when authenticated with valid data', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/expenses')
        .set('Authorization', `Bearer ${authToken}`)
        .send(validExpenseData)
        .expect(201);

      expect(response.body).toMatchObject({
        id: expect.any(String),
        amount: 1500.50,
        currency: 'PKR',
        status: 'DRAFT',
        createdAt: expect.any(String),
      });
    });

    it('should return 401 when not authenticated', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/expenses')
        .send(validExpenseData)
        .expect(401);
    });

    it('should return 400 when amount is negative', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/expenses')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ ...validExpenseData, amount: -100 })
        .expect(400);

      expect(response.body.message).toContain('positive');
    });
  });
});
```

---

## Frontend Component Tests (with RTK Query)

### Component Test Pattern

```tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { ExpenseForm } from './ExpenseForm';
import { apiSlice } from '@/store/api/apiSlice';
import { createMockCategory } from '@/test/factories';

// Create test store with RTK Query
const createTestStore = () => {
  return configureStore({
    reducer: {
      [apiSlice.reducerPath]: apiSlice.reducer,
    },
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware().concat(apiSlice.middleware),
  });
};

// Wrapper with providers
const createWrapper = () => {
  const store = createTestStore();

  return ({ children }) => (
    <Provider store={store}>
      {children}
    </Provider>
  );
};

describe('ExpenseForm', () => {
  const mockOnSubmit = jest.fn();
  const mockCategories = [
    createMockCategory({ id: 'cat-1', name: 'Travel' }),
    createMockCategory({ id: 'cat-2', name: 'Meals' }),
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders all form fields', () => {
    render(
      <ExpenseForm onSubmit={mockOnSubmit} categories={mockCategories} />,
      { wrapper: createWrapper() }
    );

    expect(screen.getByLabelText(/amount/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/currency/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/category/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/description/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /save/i })).toBeInTheDocument();
  });

  it('shows validation errors for required fields', async () => {
    const user = userEvent.setup();

    render(
      <ExpenseForm onSubmit={mockOnSubmit} categories={mockCategories} />,
      { wrapper: createWrapper() }
    );

    await user.click(screen.getByRole('button', { name: /save/i }));

    await waitFor(() => {
      expect(screen.getByText(/amount is required/i)).toBeInTheDocument();
      expect(screen.getByText(/category is required/i)).toBeInTheDocument();
    });

    expect(mockOnSubmit).not.toHaveBeenCalled();
  });

  it('submits form with valid data', async () => {
    const user = userEvent.setup();

    render(
      <ExpenseForm onSubmit={mockOnSubmit} categories={mockCategories} />,
      { wrapper: createWrapper() }
    );

    await user.type(screen.getByLabelText(/amount/i), '150.50');
    await user.selectOptions(screen.getByLabelText(/currency/i), 'PKR');
    await user.selectOptions(screen.getByLabelText(/category/i), 'cat-1');
    await user.type(screen.getByLabelText(/description/i), 'Test expense');

    await user.click(screen.getByRole('button', { name: /save/i }));

    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith({
        amount: 150.50,
        currency: 'PKR',
        categoryId: 'cat-1',
        description: 'Test expense',
      });
    });
  });
});
```

### Hook Test Pattern (with RTK Query)

```tsx
import { renderHook, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { useGetExpensesQuery } from '@/store/api/expensesApi';
import { apiSlice } from '@/store/api/apiSlice';
import { setupServer } from 'msw/node';
import { rest } from 'msw';

// MSW server for mocking API calls
const server = setupServer(
  rest.get('/api/v1/expenses', (req, res, ctx) => {
    return res(ctx.json({
      data: [
        { id: '1', amount: 100 },
        { id: '2', amount: 200 },
      ],
      meta: { total: 2, page: 1, limit: 20 },
    }));
  })
);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

const createWrapper = () => {
  const store = configureStore({
    reducer: {
      [apiSlice.reducerPath]: apiSlice.reducer,
    },
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware().concat(apiSlice.middleware),
  });

  return ({ children }) => (
    <Provider store={store}>
      {children}
    </Provider>
  );
};

describe('useGetExpensesQuery', () => {
  it('fetches expenses on mount', async () => {
    const { result } = renderHook(() => useGetExpensesQuery({}), {
      wrapper: createWrapper(),
    });

    // Initially loading
    expect(result.current.isLoading).toBe(true);

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data?.data).toHaveLength(2);
  });

  it('handles error state', async () => {
    server.use(
      rest.get('/api/v1/expenses', (req, res, ctx) => {
        return res(ctx.status(500), ctx.json({ message: 'Server error' }));
      })
    );

    const { result } = renderHook(() => useGetExpensesQuery({}), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });
  });
});
```

---

## Test Data Factories

```typescript
// test/factories/expense.factory.ts
import { faker } from '@faker-js/faker';
import { Expense, ExpenseStatus } from '@prisma/client';

export function createMockExpense(overrides: Partial<Expense> = {}): Expense {
  return {
    id: faker.string.uuid(),
    userId: faker.string.uuid(),
    departmentId: faker.string.uuid(),
    categoryId: faker.string.uuid(),
    amount: faker.number.float({ min: 10, max: 10000, precision: 0.01 }),
    currency: faker.helpers.arrayElement(['PKR', 'USD', 'GBP']),
    pkrAmount: faker.number.float({ min: 10, max: 10000, precision: 0.01 }),
    exchangeRate: 1,
    status: ExpenseStatus.DRAFT,
    description: faker.lorem.sentence(),
    expenseDate: faker.date.recent(),
    createdAt: faker.date.past(),
    updatedAt: faker.date.recent(),
    receipts: [],
    ...overrides,
  };
}

export function createMockUser(overrides = {}) {
  return {
    id: faker.string.uuid(),
    email: faker.internet.email(),
    firstName: faker.person.firstName(),
    lastName: faker.person.lastName(),
    role: 'employee',
    departmentId: faker.string.uuid(),
    ...overrides,
  };
}

export function createMockCategory(overrides = {}) {
  return {
    id: faker.string.uuid(),
    name: faker.commerce.department(),
    code: faker.string.alphanumeric(3).toUpperCase(),
    ...overrides,
  };
}
```

---

## Test Helpers

```typescript
// test/helpers/database.ts
import { PrismaClient } from '@prisma/client';

let testPrisma: PrismaClient;

export async function setupTestDatabase() {
  testPrisma = new PrismaClient({
    datasources: {
      db: { url: process.env.TEST_DATABASE_URL },
    },
  });

  await testPrisma.$connect();

  // Clear all tables
  await testPrisma.$executeRaw`TRUNCATE TABLE "User" CASCADE`;
  await testPrisma.$executeRaw`TRUNCATE TABLE "Expense" CASCADE`;
}

export async function cleanupTestDatabase() {
  if (testPrisma) {
    await testPrisma.$disconnect();
  }
}

export async function seedTestData() {
  // Seed users, categories, etc.
  // Return created entities for use in tests
}

// test/helpers/auth.ts
export async function getAuthToken(app: INestApplication, user: User): Promise<string> {
  const response = await request(app.getHttpServer())
    .post('/api/v1/auth/login')
    .send({ email: user.email, password: 'TestPass123!' });

  return response.body.accessToken;
}
```

---

## Running Tests

```bash
# Run all API tests
npm run test -w @tpl-expense/api

# Run tests in watch mode
npm run test -w @tpl-expense/api -- --watch

# Run with coverage
npm run test -w @tpl-expense/api -- --coverage

# Run specific test file
npm run test -w @tpl-expense/api -- expenses.service.test.ts

# Run frontend tests
npm run test -w @tpl-expense/web
```

---

## Best Practices

### DO
- ✅ Test behavior, not implementation
- ✅ Use descriptive test names: "should [expected behavior] when [condition]"
- ✅ One assertion focus per test
- ✅ Use factories for test data
- ✅ Clean up after tests
- ✅ Mock external services
- ✅ Test edge cases and error paths

### DON'T
- ❌ Test private methods directly
- ❌ Share state between tests
- ❌ Use real external services in unit tests
- ❌ Write flaky tests
- ❌ Test framework code
- ❌ Couple tests to implementation details
