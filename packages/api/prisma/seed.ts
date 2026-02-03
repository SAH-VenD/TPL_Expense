import { PrismaClient, RoleType, UserStatus, BudgetEnforcement, BudgetPeriod, BudgetType } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  // ==================== DEPARTMENTS ====================
  console.log('Creating departments...');

  const departments = await Promise.all([
    prisma.department.upsert({
      where: { code: 'EXEC' },
      update: {},
      create: {
        name: 'Executive',
        code: 'EXEC',
        description: 'Executive leadership team',
      },
    }),
    prisma.department.upsert({
      where: { code: 'ENG' },
      update: {},
      create: {
        name: 'Engineering',
        code: 'ENG',
        description: 'Software development and engineering',
      },
    }),
    prisma.department.upsert({
      where: { code: 'FIN' },
      update: {},
      create: {
        name: 'Finance',
        code: 'FIN',
        description: 'Finance and accounting',
      },
    }),
    prisma.department.upsert({
      where: { code: 'HR' },
      update: {},
      create: {
        name: 'Human Resources',
        code: 'HR',
        description: 'Human resources and talent management',
      },
    }),
    prisma.department.upsert({
      where: { code: 'SALES' },
      update: {},
      create: {
        name: 'Sales',
        code: 'SALES',
        description: 'Sales and business development',
      },
    }),
    prisma.department.upsert({
      where: { code: 'OPS' },
      update: {},
      create: {
        name: 'Operations',
        code: 'OPS',
        description: 'Operations and administration',
      },
    }),
  ]);

  const [execDept, engDept, finDept, hrDept, salesDept, opsDept] = departments;

  // ==================== CATEGORIES ====================
  console.log('Creating expense categories...');

  // Parent categories
  const travelCategory = await prisma.category.upsert({
    where: { code: 'TRAVEL' },
    update: {},
    create: {
      name: 'Travel & Transportation',
      code: 'TRAVEL',
      description: 'Travel and transportation expenses',
      requiresReceipt: true,
      requiresPreApproval: true,
    },
  });

  const mealsCategory = await prisma.category.upsert({
    where: { code: 'MEALS' },
    update: {},
    create: {
      name: 'Meals & Entertainment',
      code: 'MEALS',
      description: 'Business meals and entertainment',
      requiresReceipt: true,
    },
  });

  const officeCategory = await prisma.category.upsert({
    where: { code: 'OFFICE' },
    update: {},
    create: {
      name: 'Office Supplies',
      code: 'OFFICE',
      description: 'Office supplies and equipment',
      requiresReceipt: true,
    },
  });

  const techCategory = await prisma.category.upsert({
    where: { code: 'TECH' },
    update: {},
    create: {
      name: 'Technology & Software',
      code: 'TECH',
      description: 'Technology, software, and subscriptions',
      requiresReceipt: true,
    },
  });

  const profServicesCategory = await prisma.category.upsert({
    where: { code: 'PROF_SVC' },
    update: {},
    create: {
      name: 'Professional Services',
      code: 'PROF_SVC',
      description: 'Consulting and professional services',
      requiresReceipt: true,
      requiresPreApproval: true,
    },
  });

  const trainingCategory = await prisma.category.upsert({
    where: { code: 'TRAINING' },
    update: {},
    create: {
      name: 'Training & Development',
      code: 'TRAINING',
      description: 'Training, courses, and certifications',
      requiresReceipt: true,
    },
  });

  // Sub-categories for Travel
  await Promise.all([
    prisma.category.upsert({
      where: { code: 'AIRFARE' },
      update: {},
      create: {
        name: 'Airfare',
        code: 'AIRFARE',
        description: 'Flight tickets',
        parentId: travelCategory.id,
        requiresReceipt: true,
        requiresPreApproval: true,
      },
    }),
    prisma.category.upsert({
      where: { code: 'HOTEL' },
      update: {},
      create: {
        name: 'Hotel & Accommodation',
        code: 'HOTEL',
        description: 'Hotel and lodging expenses',
        parentId: travelCategory.id,
        requiresReceipt: true,
        requiresPreApproval: true,
      },
    }),
    prisma.category.upsert({
      where: { code: 'GROUND_TRANSPORT' },
      update: {},
      create: {
        name: 'Ground Transportation',
        code: 'GROUND_TRANSPORT',
        description: 'Taxi, Uber, rental cars, etc.',
        parentId: travelCategory.id,
        requiresReceipt: true,
      },
    }),
    prisma.category.upsert({
      where: { code: 'MILEAGE' },
      update: {},
      create: {
        name: 'Mileage Reimbursement',
        code: 'MILEAGE',
        description: 'Personal vehicle mileage',
        parentId: travelCategory.id,
        requiresReceipt: false,
      },
    }),
  ]);

  // Sub-categories for Meals
  await Promise.all([
    prisma.category.upsert({
      where: { code: 'CLIENT_MEALS' },
      update: {},
      create: {
        name: 'Client Meals',
        code: 'CLIENT_MEALS',
        description: 'Meals with clients',
        parentId: mealsCategory.id,
        requiresReceipt: true,
      },
    }),
    prisma.category.upsert({
      where: { code: 'TEAM_MEALS' },
      update: {},
      create: {
        name: 'Team Meals',
        code: 'TEAM_MEALS',
        description: 'Team lunches and dinners',
        parentId: mealsCategory.id,
        requiresReceipt: true,
      },
    }),
  ]);

  // Sub-categories for Tech
  await Promise.all([
    prisma.category.upsert({
      where: { code: 'SOFTWARE_SUB' },
      update: {},
      create: {
        name: 'Software Subscriptions',
        code: 'SOFTWARE_SUB',
        description: 'Monthly/annual software subscriptions',
        parentId: techCategory.id,
        requiresReceipt: true,
      },
    }),
    prisma.category.upsert({
      where: { code: 'HARDWARE' },
      update: {},
      create: {
        name: 'Hardware & Equipment',
        code: 'HARDWARE',
        description: 'Computers, peripherals, etc.',
        parentId: techCategory.id,
        requiresReceipt: true,
        requiresPreApproval: true,
      },
    }),
  ]);

  // Misc category
  await prisma.category.upsert({
    where: { code: 'MISC' },
    update: {},
    create: {
      name: 'Miscellaneous',
      code: 'MISC',
      description: 'Other uncategorized expenses',
      requiresReceipt: true,
    },
  });

  // ==================== USERS ====================
  console.log('Creating users...');

  const passwordHash = await bcrypt.hash('Admin@123', 12);
  const employeePasswordHash = await bcrypt.hash('Employee@123', 12);

  // Admin user
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@tekcellent.com' },
    update: {},
    create: {
      email: 'admin@tekcellent.com',
      passwordHash,
      firstName: 'System',
      lastName: 'Admin',
      employeeId: 'EMP001',
      status: UserStatus.ACTIVE,
      role: RoleType.ADMIN,
      departmentId: execDept.id,
    },
  });

  // Finance user
  const financeUser = await prisma.user.upsert({
    where: { email: 'finance@tekcellent.com' },
    update: {},
    create: {
      email: 'finance@tekcellent.com',
      passwordHash,
      firstName: 'Finance',
      lastName: 'Manager',
      employeeId: 'EMP002',
      status: UserStatus.ACTIVE,
      role: RoleType.FINANCE,
      departmentId: finDept.id,
    },
  });

  // Approver/Manager user
  const managerUser = await prisma.user.upsert({
    where: { email: 'manager@tekcellent.com' },
    update: {},
    create: {
      email: 'manager@tekcellent.com',
      passwordHash,
      firstName: 'Team',
      lastName: 'Manager',
      employeeId: 'EMP003',
      status: UserStatus.ACTIVE,
      role: RoleType.APPROVER,
      departmentId: engDept.id,
    },
  });

  // Regular employee
  const employeeUser = await prisma.user.upsert({
    where: { email: 'employee@tekcellent.com' },
    update: {},
    create: {
      email: 'employee@tekcellent.com',
      passwordHash: employeePasswordHash,
      firstName: 'John',
      lastName: 'Employee',
      employeeId: 'EMP004',
      status: UserStatus.ACTIVE,
      role: RoleType.EMPLOYEE,
      departmentId: engDept.id,
      managerId: managerUser.id,
    },
  });

  // CEO user
  const ceoUser = await prisma.user.upsert({
    where: { email: 'ceo@tekcellent.com' },
    update: {},
    create: {
      email: 'ceo@tekcellent.com',
      passwordHash,
      firstName: 'Chief',
      lastName: 'Executive',
      employeeId: 'EMP005',
      status: UserStatus.ACTIVE,
      role: RoleType.CEO,
      departmentId: execDept.id,
    },
  });

  // Super Approver / Director user
  const directorUser = await prisma.user.upsert({
    where: { email: 'director@tekcellent.com' },
    update: {},
    create: {
      email: 'director@tekcellent.com',
      passwordHash,
      firstName: 'Regional',
      lastName: 'Director',
      employeeId: 'EMP006',
      status: UserStatus.ACTIVE,
      role: RoleType.SUPER_APPROVER,
      departmentId: execDept.id,
    },
  });

  // ==================== APPROVAL TIERS ====================
  console.log('Creating approval tiers...');

  await Promise.all([
    prisma.approvalTier.upsert({
      where: { id: 'tier-1' },
      update: {},
      create: {
        id: 'tier-1',
        name: 'Low Value (0 - 25,000 PKR)',
        tierOrder: 1,
        minAmount: 0,
        maxAmount: 25000,
        approverRole: RoleType.APPROVER,
      },
    }),
    prisma.approvalTier.upsert({
      where: { id: 'tier-2' },
      update: {},
      create: {
        id: 'tier-2',
        name: 'Medium Value (25,001 - 100,000 PKR)',
        tierOrder: 2,
        minAmount: 25001,
        maxAmount: 100000,
        approverRole: RoleType.APPROVER,
      },
    }),
    prisma.approvalTier.upsert({
      where: { id: 'tier-3' },
      update: {},
      create: {
        id: 'tier-3',
        name: 'High Value (100,001 - 250,000 PKR)',
        tierOrder: 3,
        minAmount: 100001,
        maxAmount: 250000,
        approverRole: RoleType.FINANCE,
      },
    }),
    prisma.approvalTier.upsert({
      where: { id: 'tier-4' },
      update: {},
      create: {
        id: 'tier-4',
        name: 'High Value (250,001 - 500,000 PKR)',
        tierOrder: 4,
        minAmount: 250001,
        maxAmount: 500000,
        approverRole: RoleType.FINANCE,
      },
    }),
    prisma.approvalTier.upsert({
      where: { id: 'tier-5' },
      update: {},
      create: {
        id: 'tier-5',
        name: 'Executive (500,001+ PKR)',
        tierOrder: 5,
        minAmount: 500001,
        maxAmount: null,
        approverRole: RoleType.CEO,
      },
    }),
  ]);

  // ==================== PROJECTS ====================
  console.log('Creating sample projects...');

  await Promise.all([
    prisma.project.upsert({
      where: { code: 'PRJ-INTERNAL' },
      update: {},
      create: {
        name: 'Internal Operations',
        code: 'PRJ-INTERNAL',
        description: 'Internal company operations and overhead',
        isActive: true,
      },
    }),
    prisma.project.upsert({
      where: { code: 'PRJ-CLIENT-A' },
      update: {},
      create: {
        name: 'Client A Project',
        code: 'PRJ-CLIENT-A',
        description: 'Development project for Client A',
        clientName: 'Client A Corp',
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-12-31'),
        isActive: true,
      },
    }),
    prisma.project.upsert({
      where: { code: 'PRJ-CLIENT-B' },
      update: {},
      create: {
        name: 'Client B Project',
        code: 'PRJ-CLIENT-B',
        description: 'Consulting engagement for Client B',
        clientName: 'Client B Ltd',
        startDate: new Date('2024-03-01'),
        isActive: true,
      },
    }),
  ]);

  // ==================== COST CENTERS ====================
  console.log('Creating cost centers...');

  await Promise.all([
    prisma.costCenter.upsert({
      where: { code: 'CC-OVERHEAD' },
      update: {},
      create: {
        name: 'General Overhead',
        code: 'CC-OVERHEAD',
        description: 'General company overhead',
        departmentId: opsDept.id,
      },
    }),
    prisma.costCenter.upsert({
      where: { code: 'CC-RND' },
      update: {},
      create: {
        name: 'Research & Development',
        code: 'CC-RND',
        description: 'R&D activities',
        departmentId: engDept.id,
      },
    }),
    prisma.costCenter.upsert({
      where: { code: 'CC-SALES' },
      update: {},
      create: {
        name: 'Sales & Marketing',
        code: 'CC-SALES',
        description: 'Sales and marketing activities',
        departmentId: salesDept.id,
      },
    }),
  ]);

  // ==================== SEQUENCE COUNTERS ====================
  console.log('Initializing sequence counters...');

  const currentYear = new Date().getFullYear();

  await Promise.all([
    prisma.sequenceCounter.upsert({
      where: { name_year: { name: 'expense', year: currentYear } },
      update: {},
      create: {
        name: 'expense',
        prefix: 'EXP',
        currentValue: 0,
        year: currentYear,
      },
    }),
    prisma.sequenceCounter.upsert({
      where: { name_year: { name: 'voucher', year: currentYear } },
      update: {},
      create: {
        name: 'voucher',
        prefix: 'PCV',
        currentValue: 0,
        year: currentYear,
      },
    }),
    prisma.sequenceCounter.upsert({
      where: { name_year: { name: 'preapproval', year: currentYear } },
      update: {},
      create: {
        name: 'preapproval',
        prefix: 'PA',
        currentValue: 0,
        year: currentYear,
      },
    }),
  ]);

  // ==================== SYSTEM SETTINGS ====================
  console.log('Creating system settings...');

  await Promise.all([
    prisma.systemSetting.upsert({
      where: { key: 'expense.submission_deadline_days' },
      update: {},
      create: {
        key: 'expense.submission_deadline_days',
        value: 10,
        description: 'Number of business days to submit expense after incurring',
        category: 'expense',
      },
    }),
    prisma.systemSetting.upsert({
      where: { key: 'expense.max_file_size_mb' },
      update: {},
      create: {
        key: 'expense.max_file_size_mb',
        value: 10,
        description: 'Maximum file size for receipt uploads in MB',
        category: 'expense',
      },
    }),
    prisma.systemSetting.upsert({
      where: { key: 'approval.auto_escalation_days' },
      update: {},
      create: {
        key: 'approval.auto_escalation_days',
        value: 5,
        description: 'Number of business days before auto-escalation',
        category: 'approval',
      },
    }),
    prisma.systemSetting.upsert({
      where: { key: 'voucher.settlement_deadline_days' },
      update: {},
      create: {
        key: 'voucher.settlement_deadline_days',
        value: 7,
        description: 'Number of days to settle petty cash voucher',
        category: 'voucher',
      },
    }),
    prisma.systemSetting.upsert({
      where: { key: 'preapproval.expiry_days' },
      update: {},
      create: {
        key: 'preapproval.expiry_days',
        value: 30,
        description: 'Number of days until pre-approval expires',
        category: 'preapproval',
      },
    }),
    prisma.systemSetting.upsert({
      where: { key: 'session.inactivity_timeout_minutes' },
      update: {},
      create: {
        key: 'session.inactivity_timeout_minutes',
        value: 5,
        description: 'Session timeout after inactivity in minutes',
        category: 'session',
      },
    }),
    prisma.systemSetting.upsert({
      where: { key: 'auth.max_failed_attempts' },
      update: {},
      create: {
        key: 'auth.max_failed_attempts',
        value: 5,
        description: 'Maximum failed login attempts before lockout',
        category: 'auth',
      },
    }),
    prisma.systemSetting.upsert({
      where: { key: 'auth.lockout_duration_minutes' },
      update: {},
      create: {
        key: 'auth.lockout_duration_minutes',
        value: 15,
        description: 'Account lockout duration in minutes',
        category: 'auth',
      },
    }),
  ]);

  // ==================== MILEAGE RATES ====================
  console.log('Creating mileage rates...');

  await Promise.all([
    prisma.mileageRate.upsert({
      where: { id: 'mileage-car' },
      update: {},
      create: {
        id: 'mileage-car',
        name: 'Car Standard Rate',
        vehicleType: 'car',
        ratePerKm: 25.00,
        effectiveFrom: new Date('2024-01-01'),
      },
    }),
    prisma.mileageRate.upsert({
      where: { id: 'mileage-motorcycle' },
      update: {},
      create: {
        id: 'mileage-motorcycle',
        name: 'Motorcycle Standard Rate',
        vehicleType: 'motorcycle',
        ratePerKm: 15.00,
        effectiveFrom: new Date('2024-01-01'),
      },
    }),
  ]);

  // ==================== PER DIEM RATES ====================
  console.log('Creating per diem rates...');

  await Promise.all([
    prisma.perDiemRate.upsert({
      where: { id: 'perdiem-domestic' },
      update: {},
      create: {
        id: 'perdiem-domestic',
        destination: 'Pakistan - Domestic',
        destinationType: 'DOMESTIC',
        dailyRate: 5000.00,
        halfDayRate: 2500.00,
        effectiveFrom: new Date('2024-01-01'),
      },
    }),
    prisma.perDiemRate.upsert({
      where: { id: 'perdiem-uk' },
      update: {},
      create: {
        id: 'perdiem-uk',
        destination: 'United Kingdom',
        destinationType: 'INTERNATIONAL',
        dailyRate: 150.00,
        halfDayRate: 75.00,
        currency: 'GBP',
        effectiveFrom: new Date('2024-01-01'),
      },
    }),
    prisma.perDiemRate.upsert({
      where: { id: 'perdiem-uae' },
      update: {},
      create: {
        id: 'perdiem-uae',
        destination: 'United Arab Emirates',
        destinationType: 'INTERNATIONAL',
        dailyRate: 500.00,
        halfDayRate: 250.00,
        currency: 'AED',
        effectiveFrom: new Date('2024-01-01'),
      },
    }),
  ]);

  // ==================== EXCHANGE RATES ====================
  console.log('Creating exchange rates...');

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  await Promise.all([
    prisma.exchangeRate.upsert({
      where: {
        fromCurrency_toCurrency_effectiveDate: {
          fromCurrency: 'USD',
          toCurrency: 'PKR',
          effectiveDate: today,
        },
      },
      update: {},
      create: {
        fromCurrency: 'USD',
        toCurrency: 'PKR',
        rate: 278.50,
        effectiveDate: today,
        source: 'seed',
      },
    }),
    prisma.exchangeRate.upsert({
      where: {
        fromCurrency_toCurrency_effectiveDate: {
          fromCurrency: 'GBP',
          toCurrency: 'PKR',
          effectiveDate: today,
        },
      },
      update: {},
      create: {
        fromCurrency: 'GBP',
        toCurrency: 'PKR',
        rate: 352.00,
        effectiveDate: today,
        source: 'seed',
      },
    }),
    prisma.exchangeRate.upsert({
      where: {
        fromCurrency_toCurrency_effectiveDate: {
          fromCurrency: 'AED',
          toCurrency: 'PKR',
          effectiveDate: today,
        },
      },
      update: {},
      create: {
        fromCurrency: 'AED',
        toCurrency: 'PKR',
        rate: 75.80,
        effectiveDate: today,
        source: 'seed',
      },
    }),
    prisma.exchangeRate.upsert({
      where: {
        fromCurrency_toCurrency_effectiveDate: {
          fromCurrency: 'SAR',
          toCurrency: 'PKR',
          effectiveDate: today,
        },
      },
      update: {},
      create: {
        fromCurrency: 'SAR',
        toCurrency: 'PKR',
        rate: 74.20,
        effectiveDate: today,
        source: 'seed',
      },
    }),
  ]);

  console.log('');
  console.log('✅ Database seeded successfully!');
  console.log('');
  console.log('📋 Created:');
  console.log('   - 6 Departments');
  console.log('   - 15 Expense Categories');
  console.log('   - 6 Users');
  console.log('   - 5 Approval Tiers');
  console.log('   - 3 Projects');
  console.log('   - 3 Cost Centers');
  console.log('   - 3 Sequence Counters');
  console.log('   - 8 System Settings');
  console.log('   - 2 Mileage Rates');
  console.log('   - 3 Per Diem Rates');
  console.log('   - 4 Exchange Rates');
  console.log('');
  console.log('👤 Test Accounts:');
  console.log('   Admin:         admin@tekcellent.com / Admin@123');
  console.log('   CEO:           ceo@tekcellent.com / Admin@123');
  console.log('   Director:      director@tekcellent.com / Admin@123 (SUPER_APPROVER)');
  console.log('   Finance:       finance@tekcellent.com / Admin@123');
  console.log('   Manager:       manager@tekcellent.com / Admin@123 (APPROVER)');
  console.log('   Employee:      employee@tekcellent.com / Employee@123');
  console.log('');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
