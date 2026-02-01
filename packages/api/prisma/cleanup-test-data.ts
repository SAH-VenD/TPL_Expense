import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

// Metadata file path
const METADATA_PATH = path.join(__dirname, 'seed-metadata.json');

interface SeedMetadata {
  createdAt: string;
  tables: Record<string, string[]>;
}

// Tables in reverse dependency order for safe deletion
const DELETION_ORDER = [
  'Notification',
  'Comment',
  'Receipt',
  'ExpenseSplit',
  'Expense',
  'Voucher',
  'PreApproval',
  'ApprovalDelegation',
  'Budget',
  'VendorCategoryMapping',
  'User',
  'Project',
  'CostCenter',
  'SequenceCounter',
  'ApprovalTier',
  'PerDiemRate',
  'MileageRate',
  'ExchangeRate',
  'Permission',
  'SystemSetting',
  'Vendor',
  'Category',
  'Department',
];

// Map table names to Prisma model delete methods
const TABLE_TO_MODEL: Record<string, string> = {
  Notification: 'notification',
  Comment: 'comment',
  Receipt: 'receipt',
  ExpenseSplit: 'expenseSplit',
  Expense: 'expense',
  Voucher: 'voucher',
  PreApproval: 'preApproval',
  ApprovalDelegation: 'approvalDelegation',
  Budget: 'budget',
  VendorCategoryMapping: 'vendorCategoryMapping',
  User: 'user',
  Project: 'project',
  CostCenter: 'costCenter',
  SequenceCounter: 'sequenceCounter',
  ApprovalTier: 'approvalTier',
  PerDiemRate: 'perDiemRate',
  MileageRate: 'mileageRate',
  ExchangeRate: 'exchangeRate',
  Permission: 'permission',
  SystemSetting: 'systemSetting',
  Vendor: 'vendor',
  Category: 'category',
  Department: 'department',
};

async function main() {
  console.log('🧹 Starting test data cleanup...\n');

  // Check if metadata file exists
  if (!fs.existsSync(METADATA_PATH)) {
    console.log('❌ No seed metadata file found at:', METADATA_PATH);
    console.log('   Run the seed script first: npm run db:seed:test');
    process.exit(1);
  }

  // Read metadata
  const metadata: SeedMetadata = JSON.parse(fs.readFileSync(METADATA_PATH, 'utf-8'));
  console.log(`Found metadata from: ${metadata.createdAt}\n`);

  // Track deletion stats
  const stats: Record<string, { found: number; deleted: number }> = {};

  // Delete records in reverse dependency order
  for (const table of DELETION_ORDER) {
    const ids = metadata.tables[table];
    if (!ids || ids.length === 0) {
      continue;
    }

    const modelName = TABLE_TO_MODEL[table];
    if (!modelName) {
      console.log(`  ⚠️  Unknown table: ${table}`);
      continue;
    }

    stats[table] = { found: ids.length, deleted: 0 };

    try {
      // @ts-ignore - Dynamic model access
      const result = await prisma[modelName].deleteMany({
        where: {
          id: {
            in: ids,
          },
        },
      });

      stats[table].deleted = result.count;
      console.log(`  ✓ ${table}: ${result.count}/${ids.length} records deleted`);
    } catch (error: any) {
      console.log(`  ✗ ${table}: Error - ${error.message}`);
    }
  }

  // Remove metadata file
  fs.unlinkSync(METADATA_PATH);
  console.log(`\n✓ Metadata file removed`);

  // Print summary
  console.log('\n📊 Cleanup Summary:');
  console.log('─'.repeat(50));

  let totalFound = 0;
  let totalDeleted = 0;

  for (const [table, { found, deleted }] of Object.entries(stats)) {
    totalFound += found;
    totalDeleted += deleted;
    const status = found === deleted ? '✓' : '⚠️';
    console.log(`  ${status} ${table}: ${deleted}/${found}`);
  }

  console.log('─'.repeat(50));
  console.log(`  Total: ${totalDeleted}/${totalFound} records deleted`);

  console.log('\n✅ Test data cleanup complete!');
}

// Alternative: Delete by pattern (backup method if metadata is missing)
async function cleanupByPattern() {
  console.log('🧹 Cleaning up test data by pattern [TEST]...\n');

  const tables = [
    { name: 'Notification', model: 'notification', field: 'title' },
    { name: 'Comment', model: 'comment', field: 'content' },
    { name: 'Receipt', model: 'receipt', field: 'originalName' },
    { name: 'Expense', model: 'expense', field: 'description' },
    { name: 'Voucher', model: 'voucher', field: 'purpose' },
    { name: 'PreApproval', model: 'preApproval', field: 'description' },
    { name: 'ApprovalDelegation', model: 'approvalDelegation', field: 'reason' },
    { name: 'Budget', model: 'budget', field: 'name' },
    { name: 'User', model: 'user', field: 'firstName' },
    { name: 'Project', model: 'project', field: 'name' },
    { name: 'CostCenter', model: 'costCenter', field: 'name' },
    { name: 'ApprovalTier', model: 'approvalTier', field: 'name' },
    { name: 'PerDiemRate', model: 'perDiemRate', field: 'destination' },
    { name: 'MileageRate', model: 'mileageRate', field: 'name' },
    { name: 'ExchangeRate', model: 'exchangeRate', field: 'source' },
    { name: 'Permission', model: 'permission', field: 'name' },
    { name: 'SystemSetting', model: 'systemSetting', field: 'description' },
    { name: 'Vendor', model: 'vendor', field: 'name' },
    { name: 'Category', model: 'category', field: 'name' },
    { name: 'Department', model: 'department', field: 'name' },
  ];

  for (const { name, model, field } of tables) {
    try {
      // @ts-ignore - Dynamic model access
      const result = await prisma[model].deleteMany({
        where: {
          [field]: {
            contains: '[TEST]',
          },
        },
      });

      if (result.count > 0) {
        console.log(`  ✓ ${name}: ${result.count} records deleted`);
      }
    } catch (error: any) {
      console.log(`  ✗ ${name}: Error - ${error.message}`);
    }
  }

  // Handle tables without text fields (delete by code pattern)
  try {
    const seqResult = await prisma.sequenceCounter.deleteMany({
      where: {
        name: {
          startsWith: 'test_',
        },
      },
    });
    if (seqResult.count > 0) {
      console.log(`  ✓ SequenceCounter: ${seqResult.count} records deleted`);
    }
  } catch (error: any) {
    console.log(`  ✗ SequenceCounter: Error - ${error.message}`);
  }

  // Clean up vendor category mappings (via vendor)
  try {
    const vendors = await prisma.vendor.findMany({
      where: { name: { contains: '[TEST]' } },
      select: { id: true },
    });

    if (vendors.length > 0) {
      const vcmResult = await prisma.vendorCategoryMapping.deleteMany({
        where: {
          vendorId: {
            in: vendors.map(v => v.id),
          },
        },
      });
      if (vcmResult.count > 0) {
        console.log(`  ✓ VendorCategoryMapping: ${vcmResult.count} records deleted`);
      }
    }
  } catch (error: any) {
    console.log(`  ✗ VendorCategoryMapping: Error - ${error.message}`);
  }

  // Clean up expense splits (via expense)
  try {
    const expenses = await prisma.expense.findMany({
      where: { description: { contains: '[TEST]' } },
      select: { id: true },
    });

    if (expenses.length > 0) {
      const splitResult = await prisma.expenseSplit.deleteMany({
        where: {
          expenseId: {
            in: expenses.map(e => e.id),
          },
        },
      });
      if (splitResult.count > 0) {
        console.log(`  ✓ ExpenseSplit: ${splitResult.count} records deleted`);
      }
    }
  } catch (error: any) {
    console.log(`  ✗ ExpenseSplit: Error - ${error.message}`);
  }

  console.log('\n✅ Pattern-based cleanup complete!');
}

// Check command line args
const args = process.argv.slice(2);
if (args.includes('--by-pattern')) {
  cleanupByPattern()
    .catch((e) => {
      console.error('Error during cleanup:', e);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
} else {
  main()
    .catch((e) => {
      console.error('Error during cleanup:', e);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
