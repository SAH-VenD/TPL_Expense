import { PrismaClient } from '@prisma/client';
import { faker } from '@faker-js/faker';
import * as bcrypt from 'bcrypt';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

// Metadata file path for tracking created records
const METADATA_PATH = path.join(__dirname, 'seed-metadata.json');

// Store all created IDs for cleanup
interface SeedMetadata {
  createdAt: string;
  tables: Record<string, string[]>;
}

const metadata: SeedMetadata = {
  createdAt: new Date().toISOString(),
  tables: {},
};

// Helper to track created records
function trackRecord(table: string, id: string) {
  if (!metadata.tables[table]) {
    metadata.tables[table] = [];
  }
  metadata.tables[table].push(id);
}

// Helper to save metadata
function saveMetadata() {
  fs.writeFileSync(METADATA_PATH, JSON.stringify(metadata, null, 2));
  console.log(`\nMetadata saved to: ${METADATA_PATH}`);
}

// Test password for all seeded users
const TEST_PASSWORD = 'Test@123';

async function main() {
  console.log('🌱 Starting test data seeding...\n');

  // Hash password once
  const passwordHash = await bcrypt.hash(TEST_PASSWORD, 12);

  // ==================== LEVEL 0: Independent Tables ====================
  console.log('Level 0: Seeding independent tables...');

  // Departments (10 - 5 root, 5 children)
  console.log('  - Departments');
  const departments = await seedDepartments();

  // Categories (10 - 5 root, 5 children)
  console.log('  - Categories');
  const categories = await seedCategories();

  // Vendors (10)
  console.log('  - Vendors');
  const vendors = await seedVendors();

  // System Settings (10)
  console.log('  - SystemSettings');
  await seedSystemSettings();

  // Permissions (10)
  console.log('  - Permissions');
  await seedPermissions();

  // Exchange Rates (10)
  console.log('  - ExchangeRates');
  await seedExchangeRates();

  // Mileage Rates (10)
  console.log('  - MileageRates');
  await seedMileageRates();

  // Per Diem Rates (10)
  console.log('  - PerDiemRates');
  await seedPerDiemRates();

  // Approval Tiers (10)
  console.log('  - ApprovalTiers');
  await seedApprovalTiers();

  // Sequence Counters (3)
  console.log('  - SequenceCounters');
  await seedSequenceCounters();

  // ==================== LEVEL 1: First Dependencies ====================
  console.log('\nLevel 1: Seeding first dependency tables...');

  // Cost Centers (10)
  console.log('  - CostCenters');
  const costCenters = await seedCostCenters(departments);

  // Projects (10)
  console.log('  - Projects');
  const projects = await seedProjects();

  // Users (10)
  console.log('  - Users');
  const users = await seedUsers(departments, passwordHash);

  // Vendor Category Mappings (10)
  console.log('  - VendorCategoryMappings');
  await seedVendorCategoryMappings(vendors, categories);

  // ==================== LEVEL 2: Second Dependencies ====================
  console.log('\nLevel 2: Seeding second dependency tables...');

  // Budgets (10)
  console.log('  - Budgets');
  const budgets = await seedBudgets(users, departments, projects, costCenters, categories);

  // Approval Delegations (10)
  console.log('  - ApprovalDelegations');
  await seedApprovalDelegations(users);

  // ==================== LEVEL 3: Third Dependencies ====================
  console.log('\nLevel 3: Seeding third dependency tables...');

  // Pre-Approvals (10)
  console.log('  - PreApprovals');
  const preApprovals = await seedPreApprovals(users, categories);

  // Vouchers (10)
  console.log('  - Vouchers');
  const vouchers = await seedVouchers(users);

  // ==================== LEVEL 4: Expense Dependencies ====================
  console.log('\nLevel 4: Seeding expenses...');

  // Expenses (10)
  console.log('  - Expenses');
  const expenses = await seedExpenses(
    users,
    categories,
    departments,
    projects,
    costCenters,
    budgets,
    preApprovals,
    vouchers,
    vendors
  );

  // ==================== LEVEL 5: Expense Children ====================
  console.log('\nLevel 5: Seeding expense children...');

  // Expense Splits (10)
  console.log('  - ExpenseSplits');
  await seedExpenseSplits(expenses, categories);

  // Receipts (10)
  console.log('  - Receipts');
  await seedReceipts(expenses);

  // Comments (10)
  console.log('  - Comments');
  await seedComments(expenses, users);

  // ==================== LEVEL 6: User Children ====================
  console.log('\nLevel 6: Seeding user children...');

  // Notifications (10)
  console.log('  - Notifications');
  await seedNotifications(users);

  // Save metadata for cleanup
  saveMetadata();

  console.log('\n✅ Test data seeding complete!');
  console.log(`\nSeeded users can login with password: ${TEST_PASSWORD}`);
  console.log('\nTo cleanup test data, run: npm run db:cleanup:test');
}

// ==================== SEEDER FUNCTIONS ====================

async function seedDepartments() {
  const rootDepts = [
    { name: '[TEST] Engineering', code: 'TEST-ENG', description: '[TEST] Engineering department' },
    { name: '[TEST] Finance', code: 'TEST-FIN', description: '[TEST] Finance department' },
    { name: '[TEST] Marketing', code: 'TEST-MKT', description: '[TEST] Marketing department' },
    { name: '[TEST] Operations', code: 'TEST-OPS', description: '[TEST] Operations department' },
    { name: '[TEST] Human Resources', code: 'TEST-HR', description: '[TEST] HR department' },
  ];

  const createdRoots: any[] = [];
  for (const dept of rootDepts) {
    const created = await prisma.department.create({ data: dept });
    trackRecord('Department', created.id);
    createdRoots.push(created);
  }

  // Create child departments
  const childDepts = [
    { name: '[TEST] Frontend Team', code: 'TEST-ENG-FE', description: '[TEST] Frontend team', parentId: createdRoots[0].id },
    { name: '[TEST] Backend Team', code: 'TEST-ENG-BE', description: '[TEST] Backend team', parentId: createdRoots[0].id },
    { name: '[TEST] Accounts Payable', code: 'TEST-FIN-AP', description: '[TEST] AP team', parentId: createdRoots[1].id },
    { name: '[TEST] Digital Marketing', code: 'TEST-MKT-DIG', description: '[TEST] Digital team', parentId: createdRoots[2].id },
    { name: '[TEST] Logistics', code: 'TEST-OPS-LOG', description: '[TEST] Logistics team', parentId: createdRoots[3].id },
  ];

  const createdChildren: any[] = [];
  for (const dept of childDepts) {
    const created = await prisma.department.create({ data: dept });
    trackRecord('Department', created.id);
    createdChildren.push(created);
  }

  return [...createdRoots, ...createdChildren];
}

async function seedCategories() {
  const rootCats = [
    { name: '[TEST] Travel', code: 'TEST-TRV', description: '[TEST] Travel expenses', requiresReceipt: true },
    { name: '[TEST] Office Supplies', code: 'TEST-OFF', description: '[TEST] Office supplies', requiresReceipt: true },
    { name: '[TEST] Meals', code: 'TEST-MEL', description: '[TEST] Meal expenses', requiresReceipt: true },
    { name: '[TEST] Software', code: 'TEST-SFT', description: '[TEST] Software subscriptions', requiresReceipt: true },
    { name: '[TEST] Equipment', code: 'TEST-EQP', description: '[TEST] Equipment purchases', requiresReceipt: true, requiresPreApproval: true, maxAmount: 50000 },
  ];

  const createdRoots: any[] = [];
  for (const cat of rootCats) {
    const created = await prisma.category.create({ data: cat });
    trackRecord('Category', created.id);
    createdRoots.push(created);
  }

  // Create child categories
  const childCats = [
    { name: '[TEST] Airfare', code: 'TEST-TRV-AIR', description: '[TEST] Flight tickets', parentId: createdRoots[0].id, requiresReceipt: true },
    { name: '[TEST] Hotel', code: 'TEST-TRV-HTL', description: '[TEST] Hotel stays', parentId: createdRoots[0].id, requiresReceipt: true },
    { name: '[TEST] Stationery', code: 'TEST-OFF-STN', description: '[TEST] Stationery items', parentId: createdRoots[1].id, requiresReceipt: true },
    { name: '[TEST] Client Meals', code: 'TEST-MEL-CLT', description: '[TEST] Client entertainment', parentId: createdRoots[2].id, requiresReceipt: true },
    { name: '[TEST] Laptops', code: 'TEST-EQP-LAP', description: '[TEST] Laptop purchases', parentId: createdRoots[4].id, requiresReceipt: true, requiresPreApproval: true, maxAmount: 200000 },
  ];

  const createdChildren: any[] = [];
  for (const cat of childCats) {
    const created = await prisma.category.create({ data: cat });
    trackRecord('Category', created.id);
    createdChildren.push(created);
  }

  return [...createdRoots, ...createdChildren];
}

async function seedVendors() {
  const vendorData = [
    { name: '[TEST] Pakistan Airlines', normalizedName: 'test_pakistan_airlines', taxId: 'NTN-1234567', isVerified: true },
    { name: '[TEST] Marriott Hotel', normalizedName: 'test_marriott_hotel', taxId: 'NTN-2345678', isVerified: true },
    { name: '[TEST] Office Depot', normalizedName: 'test_office_depot', taxId: 'NTN-3456789', isVerified: true },
    { name: '[TEST] TechMart', normalizedName: 'test_techmart', taxId: 'NTN-4567890', isVerified: true },
    { name: '[TEST] Food Court', normalizedName: 'test_food_court', isVerified: false },
    { name: '[TEST] Uber Pakistan', normalizedName: 'test_uber_pakistan', isVerified: true },
    { name: '[TEST] Shell Fuel', normalizedName: 'test_shell_fuel', taxId: 'NTN-5678901', isVerified: true },
    { name: '[TEST] Microsoft', normalizedName: 'test_microsoft', taxId: 'NTN-6789012', isVerified: true },
    { name: '[TEST] Amazon AWS', normalizedName: 'test_amazon_aws', taxId: 'NTN-7890123', isVerified: true },
    { name: '[TEST] Local Restaurant', normalizedName: 'test_local_restaurant', isVerified: false },
  ];

  const created: any[] = [];
  for (const vendor of vendorData) {
    const v = await prisma.vendor.create({ data: vendor });
    trackRecord('Vendor', v.id);
    created.push(v);
  }
  return created;
}

async function seedSystemSettings() {
  const settings = [
    { key: 'test_expense_limit_daily', value: { amount: 50000, currency: 'PKR' }, description: '[TEST] Daily expense limit', category: 'limits' },
    { key: 'test_expense_limit_monthly', value: { amount: 500000, currency: 'PKR' }, description: '[TEST] Monthly expense limit', category: 'limits' },
    { key: 'test_receipt_required_above', value: { amount: 1000 }, description: '[TEST] Receipt required above this amount', category: 'policies' },
    { key: 'test_auto_approve_below', value: { amount: 5000 }, description: '[TEST] Auto approve below this amount', category: 'policies' },
    { key: 'test_escalation_days', value: { days: 3 }, description: '[TEST] Escalate after these many days', category: 'workflow' },
    { key: 'test_voucher_settlement_days', value: { days: 14 }, description: '[TEST] Voucher settlement deadline', category: 'workflow' },
    { key: 'test_budget_warning_threshold', value: { percentage: 80 }, description: '[TEST] Budget warning threshold', category: 'alerts' },
    { key: 'test_email_notifications', value: { enabled: true }, description: '[TEST] Email notifications enabled', category: 'notifications' },
    { key: 'test_fiscal_year_start', value: { month: 7, day: 1 }, description: '[TEST] Fiscal year start date', category: 'organization' },
    { key: 'test_currency_default', value: { currency: 'PKR' }, description: '[TEST] Default currency', category: 'organization' },
  ];

  for (const setting of settings) {
    const s = await prisma.systemSetting.create({ data: setting });
    trackRecord('SystemSetting', s.id);
  }
}

async function seedPermissions() {
  const permissions = [
    { name: 'test_expense_create', description: '[TEST] Create expenses' },
    { name: 'test_expense_approve', description: '[TEST] Approve expenses' },
    { name: 'test_expense_delete', description: '[TEST] Delete expenses' },
    { name: 'test_voucher_create', description: '[TEST] Create vouchers' },
    { name: 'test_voucher_approve', description: '[TEST] Approve vouchers' },
    { name: 'test_budget_manage', description: '[TEST] Manage budgets' },
    { name: 'test_user_manage', description: '[TEST] Manage users' },
    { name: 'test_report_view', description: '[TEST] View reports' },
    { name: 'test_report_export', description: '[TEST] Export reports' },
    { name: 'test_settings_manage', description: '[TEST] Manage settings' },
  ];

  for (const perm of permissions) {
    const p = await prisma.permission.create({ data: perm });
    trackRecord('Permission', p.id);
  }
}

async function seedExchangeRates() {
  const today = new Date();
  const rates = [
    { fromCurrency: 'USD', rate: 278.50, effectiveDate: today },
    { fromCurrency: 'GBP', rate: 352.30, effectiveDate: today },
    { fromCurrency: 'AED', rate: 75.80, effectiveDate: today },
    { fromCurrency: 'SAR', rate: 74.20, effectiveDate: today },
    { fromCurrency: 'USD', rate: 277.80, effectiveDate: new Date(today.getTime() - 86400000) },
    { fromCurrency: 'GBP', rate: 351.50, effectiveDate: new Date(today.getTime() - 86400000) },
    { fromCurrency: 'USD', rate: 279.10, effectiveDate: new Date(today.getTime() - 172800000) },
    { fromCurrency: 'GBP', rate: 353.00, effectiveDate: new Date(today.getTime() - 172800000) },
    { fromCurrency: 'AED', rate: 75.60, effectiveDate: new Date(today.getTime() - 86400000) },
    { fromCurrency: 'SAR', rate: 74.00, effectiveDate: new Date(today.getTime() - 86400000) },
  ] as const;

  for (const rate of rates) {
    const r = await prisma.exchangeRate.create({
      data: {
        fromCurrency: rate.fromCurrency,
        toCurrency: 'PKR',
        rate: rate.rate,
        effectiveDate: rate.effectiveDate,
        source: '[TEST] Manual Entry',
      },
    });
    trackRecord('ExchangeRate', r.id);
  }
}

async function seedMileageRates() {
  const today = new Date();
  const rates = [
    { name: '[TEST] Car - Standard', vehicleType: 'CAR', ratePerKm: 25.00, effectiveFrom: today },
    { name: '[TEST] Car - Premium', vehicleType: 'CAR_PREMIUM', ratePerKm: 35.00, effectiveFrom: today },
    { name: '[TEST] Motorcycle', vehicleType: 'MOTORCYCLE', ratePerKm: 15.00, effectiveFrom: today },
    { name: '[TEST] Electric Vehicle', vehicleType: 'EV', ratePerKm: 20.00, effectiveFrom: today },
    { name: '[TEST] Van', vehicleType: 'VAN', ratePerKm: 40.00, effectiveFrom: today },
    { name: '[TEST] Car - Old Rate', vehicleType: 'CAR', ratePerKm: 22.00, effectiveFrom: new Date('2024-01-01'), effectiveTo: new Date('2024-12-31'), isActive: false },
    { name: '[TEST] Motorcycle - Old', vehicleType: 'MOTORCYCLE', ratePerKm: 12.00, effectiveFrom: new Date('2024-01-01'), effectiveTo: new Date('2024-12-31'), isActive: false },
    { name: '[TEST] Bike', vehicleType: 'BICYCLE', ratePerKm: 5.00, effectiveFrom: today },
    { name: '[TEST] Truck', vehicleType: 'TRUCK', ratePerKm: 50.00, effectiveFrom: today },
    { name: '[TEST] SUV', vehicleType: 'SUV', ratePerKm: 30.00, effectiveFrom: today },
  ];

  for (const rate of rates) {
    const r = await prisma.mileageRate.create({ data: rate });
    trackRecord('MileageRate', r.id);
  }
}

async function seedPerDiemRates() {
  const today = new Date();
  const rates = [
    { destination: '[TEST] Lahore', destinationType: 'DOMESTIC', dailyRate: 5000, halfDayRate: 2500, effectiveFrom: today },
    { destination: '[TEST] Karachi', destinationType: 'DOMESTIC', dailyRate: 6000, halfDayRate: 3000, effectiveFrom: today },
    { destination: '[TEST] Islamabad', destinationType: 'DOMESTIC', dailyRate: 5500, halfDayRate: 2750, effectiveFrom: today },
    { destination: '[TEST] Dubai', destinationType: 'INTERNATIONAL', dailyRate: 25000, halfDayRate: 12500, currency: 'AED', effectiveFrom: today },
    { destination: '[TEST] London', destinationType: 'INTERNATIONAL', dailyRate: 35000, halfDayRate: 17500, currency: 'GBP', effectiveFrom: today },
    { destination: '[TEST] New York', destinationType: 'INTERNATIONAL', dailyRate: 40000, halfDayRate: 20000, currency: 'USD', effectiveFrom: today },
    { destination: '[TEST] Singapore', destinationType: 'INTERNATIONAL', dailyRate: 30000, halfDayRate: 15000, currency: 'USD', effectiveFrom: today },
    { destination: '[TEST] Riyadh', destinationType: 'INTERNATIONAL', dailyRate: 20000, halfDayRate: 10000, currency: 'SAR', effectiveFrom: today },
    { destination: '[TEST] Peshawar', destinationType: 'DOMESTIC', dailyRate: 4500, halfDayRate: 2250, effectiveFrom: today },
    { destination: '[TEST] Multan', destinationType: 'DOMESTIC', dailyRate: 4000, halfDayRate: 2000, effectiveFrom: today },
  ];

  for (const rate of rates) {
    const r = await prisma.perDiemRate.create({ data: rate as any });
    trackRecord('PerDiemRate', r.id);
  }
}

async function seedApprovalTiers() {
  const tiers = [
    { name: '[TEST] Self Approval', tierOrder: 0, minAmount: 0, maxAmount: 5000, approverRole: 'EMPLOYEE' },
    { name: '[TEST] Team Lead', tierOrder: 1, minAmount: 5001, maxAmount: 25000, approverRole: 'APPROVER' },
    { name: '[TEST] Department Head', tierOrder: 2, minAmount: 25001, maxAmount: 100000, approverRole: 'APPROVER' },
    { name: '[TEST] Finance Review', tierOrder: 3, minAmount: 100001, maxAmount: 500000, approverRole: 'FINANCE' },
    { name: '[TEST] Director Approval', tierOrder: 4, minAmount: 500001, maxAmount: 1000000, approverRole: 'ADMIN' },
    { name: '[TEST] CEO Approval', tierOrder: 5, minAmount: 1000001, maxAmount: null, approverRole: 'ADMIN' },
    { name: '[TEST] Petty Cash Small', tierOrder: 1, minAmount: 0, maxAmount: 10000, approverRole: 'APPROVER' },
    { name: '[TEST] Petty Cash Medium', tierOrder: 2, minAmount: 10001, maxAmount: 50000, approverRole: 'FINANCE' },
    { name: '[TEST] Travel Pre-Approval', tierOrder: 1, minAmount: 0, maxAmount: 200000, approverRole: 'APPROVER' },
    { name: '[TEST] Equipment Pre-Approval', tierOrder: 2, minAmount: 0, maxAmount: 500000, approverRole: 'ADMIN' },
  ] as const;

  for (const tier of tiers) {
    const t = await prisma.approvalTier.create({ data: tier as any });
    trackRecord('ApprovalTier', t.id);
  }
}

async function seedSequenceCounters() {
  const currentYear = new Date().getFullYear();
  const counters = [
    { name: 'test_expense', prefix: 'TEST-EXP', currentValue: 100, year: currentYear },
    { name: 'test_voucher', prefix: 'TEST-VCH', currentValue: 50, year: currentYear },
    { name: 'test_preapproval', prefix: 'TEST-PRE', currentValue: 25, year: currentYear },
  ];

  for (const counter of counters) {
    const c = await prisma.sequenceCounter.create({ data: counter });
    trackRecord('SequenceCounter', c.id);
  }
}

async function seedCostCenters(departments: any[]) {
  const costCenters = [
    { name: '[TEST] CC - Engineering', code: 'TEST-CC-ENG', description: '[TEST] Engineering cost center', departmentId: departments[0].id },
    { name: '[TEST] CC - Finance', code: 'TEST-CC-FIN', description: '[TEST] Finance cost center', departmentId: departments[1].id },
    { name: '[TEST] CC - Marketing', code: 'TEST-CC-MKT', description: '[TEST] Marketing cost center', departmentId: departments[2].id },
    { name: '[TEST] CC - Operations', code: 'TEST-CC-OPS', description: '[TEST] Operations cost center', departmentId: departments[3].id },
    { name: '[TEST] CC - HR', code: 'TEST-CC-HR', description: '[TEST] HR cost center', departmentId: departments[4].id },
    { name: '[TEST] CC - Research', code: 'TEST-CC-RND', description: '[TEST] R&D cost center', departmentId: departments[0].id },
    { name: '[TEST] CC - Sales', code: 'TEST-CC-SAL', description: '[TEST] Sales cost center', departmentId: departments[2].id },
    { name: '[TEST] CC - Support', code: 'TEST-CC-SUP', description: '[TEST] Support cost center', departmentId: departments[3].id },
    { name: '[TEST] CC - Admin', code: 'TEST-CC-ADM', description: '[TEST] Admin cost center' },
    { name: '[TEST] CC - Facilities', code: 'TEST-CC-FAC', description: '[TEST] Facilities cost center' },
  ];

  const created: any[] = [];
  for (const cc of costCenters) {
    const c = await prisma.costCenter.create({ data: cc });
    trackRecord('CostCenter', c.id);
    created.push(c);
  }
  return created;
}

async function seedProjects() {
  const today = new Date();
  const projects = [
    { name: '[TEST] Website Redesign', code: 'TEST-PRJ-WEB', description: '[TEST] Corporate website redesign', clientName: 'Internal', startDate: today, isActive: true },
    { name: '[TEST] Mobile App', code: 'TEST-PRJ-MOB', description: '[TEST] Customer mobile application', clientName: 'Marketing', startDate: today, isActive: true },
    { name: '[TEST] ERP Implementation', code: 'TEST-PRJ-ERP', description: '[TEST] ERP system rollout', clientName: 'Operations', startDate: new Date('2024-01-01'), isActive: true },
    { name: '[TEST] Cloud Migration', code: 'TEST-PRJ-CLD', description: '[TEST] Infrastructure cloud migration', clientName: 'IT', startDate: today, isActive: true },
    { name: '[TEST] Security Audit', code: 'TEST-PRJ-SEC', description: '[TEST] Annual security assessment', clientName: 'Compliance', startDate: today, endDate: new Date(today.getTime() + 90 * 86400000), isActive: true },
    { name: '[TEST] Training Program', code: 'TEST-PRJ-TRN', description: '[TEST] Employee training initiative', clientName: 'HR', startDate: today, isActive: true },
    { name: '[TEST] Marketing Campaign', code: 'TEST-PRJ-MKT', description: '[TEST] Q1 marketing campaign', clientName: 'Marketing', startDate: today, endDate: new Date(today.getTime() + 60 * 86400000), isActive: true },
    { name: '[TEST] Office Renovation', code: 'TEST-PRJ-REN', description: '[TEST] HQ office renovation', clientName: 'Facilities', startDate: today, isActive: true },
    { name: '[TEST] Client Portal', code: 'TEST-PRJ-PRT', description: '[TEST] Customer self-service portal', clientName: 'Client ABC', startDate: today, isActive: true },
    { name: '[TEST] Legacy System', code: 'TEST-PRJ-LEG', description: '[TEST] Completed legacy project', clientName: 'Internal', startDate: new Date('2023-01-01'), endDate: new Date('2023-12-31'), isActive: false },
  ];

  const created: any[] = [];
  for (const proj of projects) {
    const p = await prisma.project.create({ data: proj });
    trackRecord('Project', p.id);
    created.push(p);
  }
  return created;
}

async function seedUsers(departments: any[], passwordHash: string) {
  const users = [
    // 2 Admins
    { email: 'test.admin1@tekcellent.com', firstName: '[TEST] Admin', lastName: 'One', employeeId: 'TEST-EMP-001', role: 'ADMIN', status: 'ACTIVE', departmentId: departments[1].id },
    { email: 'test.admin2@tekcellent.com', firstName: '[TEST] Admin', lastName: 'Two', employeeId: 'TEST-EMP-002', role: 'ADMIN', status: 'ACTIVE', departmentId: departments[3].id },
    // 2 Finance
    { email: 'test.finance1@tekcellent.com', firstName: '[TEST] Finance', lastName: 'Manager', employeeId: 'TEST-EMP-003', role: 'FINANCE', status: 'ACTIVE', departmentId: departments[1].id },
    { email: 'test.finance2@tekcellent.com', firstName: '[TEST] Finance', lastName: 'Analyst', employeeId: 'TEST-EMP-004', role: 'FINANCE', status: 'ACTIVE', departmentId: departments[1].id },
    // 2 Approvers
    { email: 'test.approver1@tekcellent.com', firstName: '[TEST] Team', lastName: 'Lead', employeeId: 'TEST-EMP-005', role: 'APPROVER', status: 'ACTIVE', departmentId: departments[0].id },
    { email: 'test.approver2@tekcellent.com', firstName: '[TEST] Department', lastName: 'Head', employeeId: 'TEST-EMP-006', role: 'APPROVER', status: 'ACTIVE', departmentId: departments[2].id },
    // 4 Employees
    { email: 'test.employee1@tekcellent.com', firstName: '[TEST] John', lastName: 'Developer', employeeId: 'TEST-EMP-007', role: 'EMPLOYEE', status: 'ACTIVE', departmentId: departments[5].id },
    { email: 'test.employee2@tekcellent.com', firstName: '[TEST] Jane', lastName: 'Designer', employeeId: 'TEST-EMP-008', role: 'EMPLOYEE', status: 'ACTIVE', departmentId: departments[5].id },
    { email: 'test.employee3@tekcellent.com', firstName: '[TEST] Bob', lastName: 'Marketer', employeeId: 'TEST-EMP-009', role: 'EMPLOYEE', status: 'ACTIVE', departmentId: departments[8].id },
    { email: 'test.employee4@tekcellent.com', firstName: '[TEST] Alice', lastName: 'Analyst', employeeId: 'TEST-EMP-010', role: 'EMPLOYEE', status: 'ACTIVE', departmentId: departments[7].id },
  ] as const;

  const created: any[] = [];
  for (let i = 0; i < users.length; i++) {
    const user = users[i];
    // Set manager relationships
    let managerId: string | undefined;
    if (i >= 6) {
      // Employees report to approvers
      managerId = created[4].id; // First approver
    } else if (i >= 4 && i < 6) {
      // Approvers report to admins
      managerId = created[0].id; // First admin
    } else if (i >= 2 && i < 4) {
      // Finance reports to admin
      managerId = created[0].id;
    }

    const u = await prisma.user.create({
      data: {
        ...user,
        passwordHash,
        managerId,
      } as any,
    });
    trackRecord('User', u.id);
    created.push(u);
  }
  return created;
}

async function seedVendorCategoryMappings(vendors: any[], categories: any[]) {
  const mappings = [
    { vendorId: vendors[0].id, categoryId: categories[5].id, confidence: 0.95 }, // Airlines -> Airfare
    { vendorId: vendors[1].id, categoryId: categories[6].id, confidence: 0.95 }, // Marriott -> Hotel
    { vendorId: vendors[2].id, categoryId: categories[1].id, confidence: 0.90 }, // Office Depot -> Office Supplies
    { vendorId: vendors[3].id, categoryId: categories[4].id, confidence: 0.85 }, // TechMart -> Equipment
    { vendorId: vendors[4].id, categoryId: categories[2].id, confidence: 0.80 }, // Food Court -> Meals
    { vendorId: vendors[5].id, categoryId: categories[0].id, confidence: 0.90 }, // Uber -> Travel
    { vendorId: vendors[6].id, categoryId: categories[0].id, confidence: 0.85 }, // Shell -> Travel
    { vendorId: vendors[7].id, categoryId: categories[3].id, confidence: 0.95 }, // Microsoft -> Software
    { vendorId: vendors[8].id, categoryId: categories[3].id, confidence: 0.95 }, // AWS -> Software
    { vendorId: vendors[9].id, categoryId: categories[8].id, confidence: 0.75 }, // Local Restaurant -> Client Meals
  ];

  for (const mapping of mappings) {
    const m = await prisma.vendorCategoryMapping.create({ data: mapping });
    trackRecord('VendorCategoryMapping', m.id);
  }
}

async function seedBudgets(users: any[], departments: any[], projects: any[], costCenters: any[], categories: any[]) {
  const today = new Date();
  const startOfYear = new Date(today.getFullYear(), 0, 1);
  const endOfYear = new Date(today.getFullYear(), 11, 31);

  const budgets = [
    { name: '[TEST] Engineering Annual Budget', type: 'DEPARTMENT', period: 'ANNUAL', totalAmount: 5000000, usedAmount: 1500000, startDate: startOfYear, endDate: endOfYear, departmentId: departments[0].id, ownerId: users[0].id, warningThreshold: 80 },
    { name: '[TEST] Finance Quarterly Budget', type: 'DEPARTMENT', period: 'QUARTERLY', totalAmount: 1000000, usedAmount: 450000, startDate: new Date(today.getFullYear(), Math.floor(today.getMonth() / 3) * 3, 1), endDate: new Date(today.getFullYear(), Math.floor(today.getMonth() / 3) * 3 + 3, 0), departmentId: departments[1].id, ownerId: users[2].id, warningThreshold: 75 },
    { name: '[TEST] Marketing Monthly Budget', type: 'DEPARTMENT', period: 'MONTHLY', totalAmount: 500000, usedAmount: 380000, startDate: new Date(today.getFullYear(), today.getMonth(), 1), endDate: new Date(today.getFullYear(), today.getMonth() + 1, 0), departmentId: departments[2].id, ownerId: users[5].id, warningThreshold: 85 },
    { name: '[TEST] Website Project Budget', type: 'PROJECT', period: 'PROJECT_BASED', totalAmount: 2000000, usedAmount: 800000, startDate: projects[0].startDate, endDate: new Date(today.getTime() + 180 * 86400000), projectId: projects[0].id, ownerId: users[4].id },
    { name: '[TEST] Mobile App Budget', type: 'PROJECT', period: 'PROJECT_BASED', totalAmount: 3000000, usedAmount: 1200000, startDate: projects[1].startDate, endDate: new Date(today.getTime() + 365 * 86400000), projectId: projects[1].id, ownerId: users[4].id },
    { name: '[TEST] Engineering CC Budget', type: 'COST_CENTER', period: 'ANNUAL', totalAmount: 1000000, usedAmount: 250000, startDate: startOfYear, endDate: endOfYear, costCenterId: costCenters[0].id, ownerId: users[0].id },
    { name: '[TEST] Travel Category Budget', type: 'CATEGORY', period: 'ANNUAL', totalAmount: 2000000, usedAmount: 900000, startDate: startOfYear, endDate: endOfYear, categoryId: categories[0].id, ownerId: users[2].id },
    { name: '[TEST] Employee 1 Budget', type: 'EMPLOYEE', period: 'MONTHLY', totalAmount: 50000, usedAmount: 25000, startDate: new Date(today.getFullYear(), today.getMonth(), 1), endDate: new Date(today.getFullYear(), today.getMonth() + 1, 0), employeeId: users[6].id, ownerId: users[4].id },
    { name: '[TEST] Employee 2 Budget', type: 'EMPLOYEE', period: 'MONTHLY', totalAmount: 50000, usedAmount: 48000, startDate: new Date(today.getFullYear(), today.getMonth(), 1), endDate: new Date(today.getFullYear(), today.getMonth() + 1, 0), employeeId: users[7].id, ownerId: users[4].id, warningThreshold: 90 },
    { name: '[TEST] Operations Budget', type: 'DEPARTMENT', period: 'ANNUAL', totalAmount: 3000000, usedAmount: 600000, startDate: startOfYear, endDate: endOfYear, departmentId: departments[3].id, ownerId: users[1].id },
  ] as const;

  const created: any[] = [];
  for (const budget of budgets) {
    const b = await prisma.budget.create({ data: budget as any });
    trackRecord('Budget', b.id);
    created.push(b);
  }
  return created;
}

async function seedApprovalDelegations(users: any[]) {
  const today = new Date();
  const delegations = [
    { fromUserId: users[4].id, toUserId: users[5].id, startDate: today, endDate: new Date(today.getTime() + 7 * 86400000), reason: '[TEST] Vacation coverage', isActive: true },
    { fromUserId: users[5].id, toUserId: users[4].id, startDate: new Date(today.getTime() + 14 * 86400000), endDate: new Date(today.getTime() + 21 * 86400000), reason: '[TEST] Conference attendance', isActive: true },
    { fromUserId: users[2].id, toUserId: users[3].id, startDate: today, endDate: new Date(today.getTime() + 5 * 86400000), reason: '[TEST] Training session', isActive: true },
    { fromUserId: users[0].id, toUserId: users[1].id, startDate: new Date(today.getTime() + 30 * 86400000), endDate: new Date(today.getTime() + 37 * 86400000), reason: '[TEST] Annual leave', isActive: true },
    { fromUserId: users[1].id, toUserId: users[0].id, startDate: new Date(today.getTime() - 30 * 86400000), endDate: new Date(today.getTime() - 23 * 86400000), reason: '[TEST] Past delegation', isActive: false },
    { fromUserId: users[4].id, toUserId: users[0].id, startDate: new Date(today.getTime() - 60 * 86400000), endDate: new Date(today.getTime() - 53 * 86400000), reason: '[TEST] Emergency coverage', isActive: false },
    { fromUserId: users[2].id, toUserId: users[0].id, startDate: today, endDate: new Date(today.getTime() + 3 * 86400000), reason: '[TEST] Sick leave', isActive: true },
    { fromUserId: users[3].id, toUserId: users[2].id, startDate: new Date(today.getTime() + 45 * 86400000), endDate: new Date(today.getTime() + 52 * 86400000), reason: '[TEST] Planned absence', isActive: true },
    { fromUserId: users[5].id, toUserId: users[0].id, startDate: new Date(today.getTime() + 60 * 86400000), endDate: new Date(today.getTime() + 67 * 86400000), reason: '[TEST] Business trip', isActive: true },
    { fromUserId: users[4].id, toUserId: users[2].id, startDate: new Date(today.getTime() + 90 * 86400000), endDate: new Date(today.getTime() + 97 * 86400000), reason: '[TEST] Future coverage', isActive: true },
  ];

  for (const delegation of delegations) {
    const d = await prisma.approvalDelegation.create({ data: delegation });
    trackRecord('ApprovalDelegation', d.id);
  }
}

async function seedPreApprovals(users: any[], categories: any[]) {
  const today = new Date();
  const preApprovals = [
    { preApprovalNumber: 'TEST-PRE-2026-001', status: 'APPROVED', requesterId: users[6].id, approverId: users[4].id, categoryId: categories[0].id, description: '[TEST] Business trip to Karachi', estimatedAmount: 150000, expectedDate: new Date(today.getTime() + 14 * 86400000), purpose: '[TEST] Client meeting', expiresAt: new Date(today.getTime() + 30 * 86400000), approvedAt: today },
    { preApprovalNumber: 'TEST-PRE-2026-002', status: 'PENDING', requesterId: users[7].id, categoryId: categories[4].id, description: '[TEST] New laptop purchase', estimatedAmount: 180000, expectedDate: new Date(today.getTime() + 7 * 86400000), purpose: '[TEST] Equipment upgrade', expiresAt: new Date(today.getTime() + 45 * 86400000) },
    { preApprovalNumber: 'TEST-PRE-2026-003', status: 'APPROVED', requesterId: users[8].id, approverId: users[5].id, categoryId: categories[0].id, description: '[TEST] Marketing conference', estimatedAmount: 200000, expectedDate: new Date(today.getTime() + 21 * 86400000), purpose: '[TEST] Industry event', expiresAt: new Date(today.getTime() + 60 * 86400000), approvedAt: new Date(today.getTime() - 5 * 86400000) },
    { preApprovalNumber: 'TEST-PRE-2026-004', status: 'REJECTED', requesterId: users[9].id, approverId: users[4].id, categoryId: categories[9].id, description: '[TEST] High-end workstation', estimatedAmount: 500000, rejectionReason: '[TEST] Budget constraints', expiresAt: new Date(today.getTime() + 30 * 86400000), rejectedAt: new Date(today.getTime() - 3 * 86400000) },
    { preApprovalNumber: 'TEST-PRE-2026-005', status: 'USED', requesterId: users[6].id, approverId: users[4].id, categoryId: categories[3].id, description: '[TEST] Software subscription', estimatedAmount: 50000, purpose: '[TEST] Development tools', expiresAt: new Date(today.getTime() + 90 * 86400000), approvedAt: new Date(today.getTime() - 10 * 86400000), actualAmount: 48000 },
    { preApprovalNumber: 'TEST-PRE-2026-006', status: 'EXPIRED', requesterId: users[7].id, approverId: users[5].id, categoryId: categories[0].id, description: '[TEST] Old travel request', estimatedAmount: 100000, expiresAt: new Date(today.getTime() - 15 * 86400000), approvedAt: new Date(today.getTime() - 60 * 86400000) },
    { preApprovalNumber: 'TEST-PRE-2026-007', status: 'PENDING', requesterId: users[8].id, categoryId: categories[4].id, description: '[TEST] Office furniture', estimatedAmount: 75000, purpose: '[TEST] Ergonomic setup', expiresAt: new Date(today.getTime() + 30 * 86400000) },
    { preApprovalNumber: 'TEST-PRE-2026-008', status: 'APPROVED', requesterId: users[9].id, approverId: users[0].id, categoryId: categories[0].id, description: '[TEST] Training seminar', estimatedAmount: 80000, expectedDate: new Date(today.getTime() + 30 * 86400000), purpose: '[TEST] Professional development', expiresAt: new Date(today.getTime() + 45 * 86400000), approvedAt: today },
    { preApprovalNumber: 'TEST-PRE-2026-009', status: 'PENDING', requesterId: users[6].id, categoryId: categories[9].id, description: '[TEST] Development server', estimatedAmount: 250000, purpose: '[TEST] Infrastructure upgrade', expiresAt: new Date(today.getTime() + 60 * 86400000) },
    { preApprovalNumber: 'TEST-PRE-2026-010', status: 'APPROVED', requesterId: users[7].id, approverId: users[4].id, categoryId: categories[2].id, description: '[TEST] Team dinner', estimatedAmount: 30000, expectedDate: new Date(today.getTime() + 7 * 86400000), purpose: '[TEST] Team building', expiresAt: new Date(today.getTime() + 14 * 86400000), approvedAt: today },
  ] as const;

  const created: any[] = [];
  for (const pa of preApprovals) {
    const p = await prisma.preApproval.create({ data: pa as any });
    trackRecord('PreApproval', p.id);
    created.push(p);
  }
  return created;
}

async function seedVouchers(users: any[]) {
  const today = new Date();
  const vouchers = [
    { voucherNumber: 'TEST-VCH-2026-001', status: 'SETTLED', requesterId: users[6].id, requestedAmount: 50000, approvedAmount: 50000, disbursedAmount: 50000, settledAmount: 48500, purpose: '[TEST] Office supplies purchase', approvedAt: new Date(today.getTime() - 20 * 86400000), disbursedAt: new Date(today.getTime() - 18 * 86400000), settledAt: new Date(today.getTime() - 5 * 86400000), underSpendAmount: 1500, cashReturned: 1500 },
    { voucherNumber: 'TEST-VCH-2026-002', status: 'DISBURSED', requesterId: users[7].id, requestedAmount: 25000, approvedAmount: 25000, disbursedAmount: 25000, purpose: '[TEST] Event catering', settlementDeadline: new Date(today.getTime() + 7 * 86400000), approvedAt: new Date(today.getTime() - 5 * 86400000), disbursedAt: new Date(today.getTime() - 3 * 86400000) },
    { voucherNumber: 'TEST-VCH-2026-003', status: 'APPROVED', requesterId: users[8].id, requestedAmount: 75000, approvedAmount: 70000, purpose: '[TEST] Client gifts', notes: '[TEST] Reduced from requested amount', approvedAt: today },
    { voucherNumber: 'TEST-VCH-2026-004', status: 'REQUESTED', requesterId: users[9].id, requestedAmount: 100000, purpose: '[TEST] Trade show expenses', notes: '[TEST] Pending approval' },
    { voucherNumber: 'TEST-VCH-2026-005', status: 'REJECTED', requesterId: users[6].id, requestedAmount: 200000, purpose: '[TEST] Equipment purchase', notes: '[TEST] Should use regular expense process' },
    { voucherNumber: 'TEST-VCH-2026-006', status: 'OVERDUE', requesterId: users[7].id, requestedAmount: 30000, approvedAmount: 30000, disbursedAmount: 30000, purpose: '[TEST] Training materials', settlementDeadline: new Date(today.getTime() - 5 * 86400000), approvedAt: new Date(today.getTime() - 25 * 86400000), disbursedAt: new Date(today.getTime() - 20 * 86400000) },
    { voucherNumber: 'TEST-VCH-2026-007', status: 'PARTIALLY_SETTLED', requesterId: users[8].id, requestedAmount: 60000, approvedAmount: 60000, disbursedAmount: 60000, settledAmount: 35000, purpose: '[TEST] Marketing materials', settlementDeadline: new Date(today.getTime() + 3 * 86400000), approvedAt: new Date(today.getTime() - 15 * 86400000), disbursedAt: new Date(today.getTime() - 12 * 86400000) },
    { voucherNumber: 'TEST-VCH-2026-008', status: 'SETTLED', requesterId: users[9].id, requestedAmount: 40000, approvedAmount: 40000, disbursedAmount: 40000, settledAmount: 42500, purpose: '[TEST] Office repairs', approvedAt: new Date(today.getTime() - 30 * 86400000), disbursedAt: new Date(today.getTime() - 28 * 86400000), settledAt: new Date(today.getTime() - 15 * 86400000), overSpendAmount: 2500 },
    { voucherNumber: 'TEST-VCH-2026-009', status: 'DISBURSED', requesterId: users[6].id, requestedAmount: 80000, approvedAmount: 80000, disbursedAmount: 80000, purpose: '[TEST] Team retreat', settlementDeadline: new Date(today.getTime() + 14 * 86400000), approvedAt: new Date(today.getTime() - 3 * 86400000), disbursedAt: today },
    { voucherNumber: 'TEST-VCH-2026-010', status: 'REQUESTED', requesterId: users[7].id, requestedAmount: 15000, purpose: '[TEST] Office snacks', notes: '[TEST] Monthly pantry supplies' },
  ] as const;

  const created: any[] = [];
  for (const voucher of vouchers) {
    const v = await prisma.voucher.create({ data: voucher as any });
    trackRecord('Voucher', v.id);
    created.push(v);
  }
  return created;
}

async function seedExpenses(
  users: any[],
  categories: any[],
  departments: any[],
  projects: any[],
  costCenters: any[],
  budgets: any[],
  preApprovals: any[],
  vouchers: any[],
  vendors: any[]
) {
  const today = new Date();
  const expenses = [
    {
      expenseNumber: 'TEST-EXP-2026-001',
      type: 'OUT_OF_POCKET',
      status: 'APPROVED',
      submitterId: users[6].id,
      submittedAt: new Date(today.getTime() - 10 * 86400000),
      vendorId: vendors[0].id,
      vendorName: vendors[0].name,
      expenseDate: new Date(today.getTime() - 15 * 86400000),
      description: '[TEST] Flight to Karachi for client meeting',
      amount: 45000,
      totalAmount: 45000,
      categoryId: categories[5].id,
      departmentId: departments[5].id,
      projectId: projects[8].id,
      costCenterId: costCenters[0].id,
      budgetId: budgets[6].id,
      preApprovalId: preApprovals[0].id,
    },
    {
      expenseNumber: 'TEST-EXP-2026-002',
      type: 'OUT_OF_POCKET',
      status: 'PENDING_APPROVAL',
      submitterId: users[7].id,
      submittedAt: today,
      vendorId: vendors[1].id,
      vendorName: vendors[1].name,
      expenseDate: new Date(today.getTime() - 3 * 86400000),
      description: '[TEST] Hotel stay for conference',
      amount: 28000,
      totalAmount: 28000,
      categoryId: categories[6].id,
      departmentId: departments[5].id,
    },
    {
      expenseNumber: 'TEST-EXP-2026-003',
      type: 'OUT_OF_POCKET',
      status: 'DRAFT',
      submitterId: users[8].id,
      vendorId: vendors[4].id,
      vendorName: vendors[4].name,
      expenseDate: today,
      description: '[TEST] Team lunch',
      amount: 8500,
      totalAmount: 8500,
      categoryId: categories[2].id,
      departmentId: departments[8].id,
    },
    {
      expenseNumber: 'TEST-EXP-2026-004',
      type: 'OUT_OF_POCKET',
      status: 'REJECTED',
      submitterId: users[9].id,
      submittedAt: new Date(today.getTime() - 7 * 86400000),
      vendorName: '[TEST] Unknown Vendor',
      expenseDate: new Date(today.getTime() - 10 * 86400000),
      description: '[TEST] Unverified expense',
      amount: 15000,
      totalAmount: 15000,
      categoryId: categories[1].id,
      departmentId: departments[7].id,
      rejectionReason: '[TEST] Missing receipt and vendor verification',
    },
    {
      expenseNumber: 'TEST-EXP-2026-005',
      type: 'PETTY_CASH',
      status: 'PAID',
      submitterId: users[6].id,
      submittedAt: new Date(today.getTime() - 20 * 86400000),
      vendorId: vendors[2].id,
      vendorName: vendors[2].name,
      expenseDate: new Date(today.getTime() - 22 * 86400000),
      description: '[TEST] Office supplies',
      amount: 12500,
      totalAmount: 12500,
      categoryId: categories[1].id,
      departmentId: departments[5].id,
      voucherId: vouchers[0].id,
    },
    {
      expenseNumber: 'TEST-EXP-2026-006',
      type: 'OUT_OF_POCKET',
      status: 'CLARIFICATION_REQUESTED',
      submitterId: users[7].id,
      submittedAt: new Date(today.getTime() - 5 * 86400000),
      vendorId: vendors[7].id,
      vendorName: vendors[7].name,
      expenseDate: new Date(today.getTime() - 8 * 86400000),
      description: '[TEST] Software license renewal',
      amount: 95000,
      totalAmount: 95000,
      categoryId: categories[3].id,
      departmentId: departments[5].id,
      clarificationNote: '[TEST] Please provide license key and confirmation email',
    },
    {
      expenseNumber: 'TEST-EXP-2026-007',
      type: 'OUT_OF_POCKET',
      status: 'SUBMITTED',
      submitterId: users[8].id,
      submittedAt: new Date(today.getTime() - 1 * 86400000),
      vendorId: vendors[5].id,
      vendorName: vendors[5].name,
      expenseDate: new Date(today.getTime() - 2 * 86400000),
      description: '[TEST] Transportation to client site',
      amount: 3500,
      totalAmount: 3500,
      categoryId: categories[0].id,
      departmentId: departments[8].id,
      isMileage: true,
      mileageStart: 'Office - Gulberg',
      mileageEnd: 'Client - DHA',
      mileageDistance: 25,
      mileageRate: 25,
      vehicleType: 'CAR',
    },
    {
      expenseNumber: 'TEST-EXP-2026-008',
      type: 'OUT_OF_POCKET',
      status: 'RESUBMITTED',
      submitterId: users[9].id,
      submittedAt: today,
      vendorId: vendors[9].id,
      vendorName: vendors[9].name,
      expenseDate: new Date(today.getTime() - 5 * 86400000),
      description: '[TEST] Client dinner - resubmitted with receipt',
      amount: 18000,
      totalAmount: 18000,
      categoryId: categories[8].id,
      departmentId: departments[7].id,
      projectId: projects[8].id,
    },
    {
      expenseNumber: 'TEST-EXP-2026-009',
      type: 'PETTY_CASH',
      status: 'APPROVED',
      submitterId: users[6].id,
      submittedAt: new Date(today.getTime() - 12 * 86400000),
      vendorName: '[TEST] Various Vendors',
      expenseDate: new Date(today.getTime() - 14 * 86400000),
      description: '[TEST] Event catering expenses',
      amount: 22000,
      totalAmount: 22000,
      categoryId: categories[2].id,
      departmentId: departments[5].id,
      voucherId: vouchers[1].id,
    },
    {
      expenseNumber: 'TEST-EXP-2026-010',
      type: 'OUT_OF_POCKET',
      status: 'APPROVED',
      submitterId: users[7].id,
      submittedAt: new Date(today.getTime() - 30 * 86400000),
      vendorId: vendors[8].id,
      vendorName: vendors[8].name,
      expenseDate: new Date(today.getTime() - 35 * 86400000),
      description: '[TEST] AWS cloud services',
      currency: 'USD',
      amount: 150,
      totalAmount: 150,
      exchangeRate: 278.50,
      amountInPKR: 41775,
      exchangeRateDate: new Date(today.getTime() - 35 * 86400000),
      categoryId: categories[3].id,
      departmentId: departments[5].id,
      projectId: projects[3].id,
      budgetId: budgets[0].id,
    },
  ] as const;

  const created: any[] = [];
  for (const expense of expenses) {
    const e = await prisma.expense.create({ data: expense as any });
    trackRecord('Expense', e.id);
    created.push(e);
  }
  return created;
}

async function seedExpenseSplits(expenses: any[], categories: any[]) {
  // Only create splits for a few expenses that make sense to split
  const splits = [
    { expenseId: expenses[0].id, categoryId: categories[5].id, amount: 35000, percentage: 77.78, description: '[TEST] Airfare portion' },
    { expenseId: expenses[0].id, categoryId: categories[0].id, amount: 10000, percentage: 22.22, description: '[TEST] Airport transfers' },
    { expenseId: expenses[1].id, categoryId: categories[6].id, amount: 25000, percentage: 89.29, description: '[TEST] Room charges' },
    { expenseId: expenses[1].id, categoryId: categories[2].id, amount: 3000, percentage: 10.71, description: '[TEST] Room service meals' },
    { expenseId: expenses[4].id, categoryId: categories[7].id, amount: 8000, percentage: 64.00, description: '[TEST] Printer paper and toner' },
    { expenseId: expenses[4].id, categoryId: categories[1].id, amount: 4500, percentage: 36.00, description: '[TEST] Pens and notebooks' },
    { expenseId: expenses[8].id, categoryId: categories[2].id, amount: 15000, percentage: 68.18, description: '[TEST] Main catering' },
    { expenseId: expenses[8].id, categoryId: categories[2].id, amount: 7000, percentage: 31.82, description: '[TEST] Beverages' },
    { expenseId: expenses[9].id, categoryId: categories[3].id, amount: 100, percentage: 66.67, description: '[TEST] EC2 instances' },
    { expenseId: expenses[9].id, categoryId: categories[3].id, amount: 50, percentage: 33.33, description: '[TEST] S3 storage' },
  ];

  for (const split of splits) {
    const s = await prisma.expenseSplit.create({ data: split });
    trackRecord('ExpenseSplit', s.id);
  }
}

async function seedReceipts(expenses: any[]) {
  // Create mock receipt records (without actual files)
  const receipts = [
    { expenseId: expenses[0].id, fileName: 'test-receipt-001.pdf', originalName: '[TEST] PIA_Ticket_Receipt.pdf', mimeType: 'application/pdf', fileSize: 125000, s3Key: 'test/receipts/001.pdf', s3Bucket: 'tpl-expense-test', ocrStatus: 'completed', ocrConfidence: 0.92 },
    { expenseId: expenses[1].id, fileName: 'test-receipt-002.jpg', originalName: '[TEST] Marriott_Invoice.jpg', mimeType: 'image/jpeg', fileSize: 850000, s3Key: 'test/receipts/002.jpg', s3Bucket: 'tpl-expense-test', ocrStatus: 'completed', ocrConfidence: 0.88 },
    { expenseId: expenses[2].id, fileName: 'test-receipt-003.png', originalName: '[TEST] Lunch_Bill.png', mimeType: 'image/png', fileSize: 420000, s3Key: 'test/receipts/003.png', s3Bucket: 'tpl-expense-test', ocrStatus: 'pending' },
    { expenseId: expenses[4].id, fileName: 'test-receipt-004.pdf', originalName: '[TEST] Office_Depot_Receipt.pdf', mimeType: 'application/pdf', fileSize: 95000, s3Key: 'test/receipts/004.pdf', s3Bucket: 'tpl-expense-test', ocrStatus: 'completed', ocrConfidence: 0.95 },
    { expenseId: expenses[5].id, fileName: 'test-receipt-005.pdf', originalName: '[TEST] Microsoft_Invoice.pdf', mimeType: 'application/pdf', fileSize: 180000, s3Key: 'test/receipts/005.pdf', s3Bucket: 'tpl-expense-test', ocrStatus: 'completed', ocrConfidence: 0.91 },
    { expenseId: expenses[7].id, fileName: 'test-receipt-006.jpg', originalName: '[TEST] Restaurant_Bill.jpg', mimeType: 'image/jpeg', fileSize: 650000, s3Key: 'test/receipts/006.jpg', s3Bucket: 'tpl-expense-test', ocrStatus: 'completed', ocrConfidence: 0.85 },
    { expenseId: expenses[8].id, fileName: 'test-receipt-007.pdf', originalName: '[TEST] Catering_Invoice_1.pdf', mimeType: 'application/pdf', fileSize: 110000, s3Key: 'test/receipts/007.pdf', s3Bucket: 'tpl-expense-test', ocrStatus: 'completed', ocrConfidence: 0.89 },
    { expenseId: expenses[8].id, fileName: 'test-receipt-008.pdf', originalName: '[TEST] Catering_Invoice_2.pdf', mimeType: 'application/pdf', fileSize: 105000, s3Key: 'test/receipts/008.pdf', s3Bucket: 'tpl-expense-test', ocrStatus: 'completed', ocrConfidence: 0.87 },
    { expenseId: expenses[9].id, fileName: 'test-receipt-009.pdf', originalName: '[TEST] AWS_Invoice.pdf', mimeType: 'application/pdf', fileSize: 220000, s3Key: 'test/receipts/009.pdf', s3Bucket: 'tpl-expense-test', ocrStatus: 'completed', ocrConfidence: 0.96 },
    { expenseId: expenses[0].id, fileName: 'test-receipt-010.jpg', originalName: '[TEST] Boarding_Pass.jpg', mimeType: 'image/jpeg', fileSize: 380000, s3Key: 'test/receipts/010.jpg', s3Bucket: 'tpl-expense-test', ocrStatus: 'completed', ocrConfidence: 0.82 },
  ];

  for (const receipt of receipts) {
    const r = await prisma.receipt.create({ data: receipt });
    trackRecord('Receipt', r.id);
  }
}

async function seedComments(expenses: any[], users: any[]) {
  const today = new Date();
  const comments = [
    { expenseId: expenses[0].id, authorId: users[4].id, content: '[TEST] Approved. Good documentation provided.', createdAt: new Date(today.getTime() - 9 * 86400000) },
    { expenseId: expenses[1].id, authorId: users[4].id, content: '[TEST] Please confirm the room rate matches our corporate discount.', createdAt: new Date(today.getTime() - 1 * 86400000) },
    { expenseId: expenses[1].id, authorId: users[7].id, content: '[TEST] Yes, this is our negotiated corporate rate of PKR 14,000/night.', createdAt: today },
    { expenseId: expenses[3].id, authorId: users[4].id, content: '[TEST] Rejected due to missing receipt. Please resubmit with proper documentation.', createdAt: new Date(today.getTime() - 5 * 86400000) },
    { expenseId: expenses[5].id, authorId: users[2].id, content: '[TEST] Need license confirmation before approval.', createdAt: new Date(today.getTime() - 3 * 86400000) },
    { expenseId: expenses[7].id, authorId: users[9].id, content: '[TEST] Resubmitting with scanned receipt attached.', createdAt: today },
    { expenseId: expenses[8].id, authorId: users[4].id, content: '[TEST] Approved for voucher settlement.', createdAt: new Date(today.getTime() - 10 * 86400000) },
    { expenseId: expenses[9].id, authorId: users[2].id, content: '[TEST] Foreign currency expense approved. Exchange rate verified.', createdAt: new Date(today.getTime() - 28 * 86400000) },
    { expenseId: expenses[6].id, authorId: users[5].id, content: '[TEST] Mileage claim looks correct. Awaiting final approval.', createdAt: today },
    { expenseId: expenses[2].id, authorId: users[8].id, content: '[TEST] Draft saved. Will submit after adding receipt.', createdAt: today },
  ];

  for (const comment of comments) {
    const c = await prisma.comment.create({ data: comment });
    trackRecord('Comment', c.id);
  }
}

async function seedNotifications(users: any[]) {
  const today = new Date();
  const notifications = [
    { userId: users[6].id, type: 'EXPENSE_APPROVED', title: '[TEST] Expense Approved', message: '[TEST] Your expense EXP-2026-001 has been approved.', entityType: 'Expense', isRead: true, readAt: new Date(today.getTime() - 8 * 86400000), createdAt: new Date(today.getTime() - 9 * 86400000) },
    { userId: users[7].id, type: 'CLARIFICATION_REQUESTED', title: '[TEST] Clarification Needed', message: '[TEST] Please provide additional details for expense EXP-2026-006.', entityType: 'Expense', isRead: false, createdAt: new Date(today.getTime() - 3 * 86400000) },
    { userId: users[4].id, type: 'EXPENSE_SUBMITTED', title: '[TEST] New Expense for Review', message: '[TEST] John Developer submitted an expense requiring your approval.', entityType: 'Expense', isRead: false, createdAt: today },
    { userId: users[8].id, type: 'BUDGET_WARNING', title: '[TEST] Budget Alert', message: '[TEST] Marketing monthly budget has reached 76% utilization.', entityType: 'Budget', isRead: true, readAt: today, createdAt: new Date(today.getTime() - 2 * 86400000) },
    { userId: users[2].id, type: 'VOUCHER_OVERDUE', title: '[TEST] Voucher Settlement Overdue', message: '[TEST] Voucher VCH-2026-006 is past its settlement deadline.', entityType: 'Voucher', isRead: false, createdAt: new Date(today.getTime() - 5 * 86400000) },
    { userId: users[9].id, type: 'EXPENSE_REJECTED', title: '[TEST] Expense Rejected', message: '[TEST] Your expense EXP-2026-004 has been rejected.', entityType: 'Expense', isRead: true, readAt: new Date(today.getTime() - 4 * 86400000), createdAt: new Date(today.getTime() - 5 * 86400000) },
    { userId: users[5].id, type: 'DELEGATION_STARTED', title: '[TEST] Delegation Active', message: '[TEST] You are now receiving approval requests delegated from Team Lead.', entityType: 'ApprovalDelegation', isRead: true, readAt: today, createdAt: today },
    { userId: users[7].id, type: 'PRE_APPROVAL_EXPIRING', title: '[TEST] Pre-Approval Expiring', message: '[TEST] Your pre-approval PRE-2026-002 expires in 5 days.', entityType: 'PreApproval', isRead: false, createdAt: new Date(today.getTime() - 1 * 86400000) },
    { userId: users[0].id, type: 'BUDGET_EXCEEDED', title: '[TEST] Budget Exceeded', message: '[TEST] Employee 2 monthly budget has exceeded the limit.', entityType: 'Budget', isRead: false, createdAt: today },
    { userId: users[6].id, type: 'VOUCHER_DISBURSED', title: '[TEST] Voucher Disbursed', message: '[TEST] Your voucher VCH-2026-009 has been disbursed.', entityType: 'Voucher', isRead: false, createdAt: today },
  ] as const;

  for (const notification of notifications) {
    const n = await prisma.notification.create({ data: notification as any });
    trackRecord('Notification', n.id);
  }
}

// Run the seeder
main()
  .catch((e) => {
    console.error('Error seeding test data:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
