/**
 * Diagnostic script to check pending approvals data
 * Run with: npx ts-node scripts/check-pending-approvals.ts
 */
import { PrismaClient, ExpenseStatus, RoleType } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔍 Checking Pending Approvals Data...\n');

  // 1. Check all expenses with SUBMITTED or PENDING_APPROVAL status
  console.log('1. EXPENSES WITH PENDING STATUS:');
  console.log('================================');
  const pendingExpenses = await prisma.expense.findMany({
    where: {
      status: {
        in: [ExpenseStatus.SUBMITTED, ExpenseStatus.PENDING_APPROVAL],
      },
    },
    include: {
      submitter: {
        select: { firstName: true, lastName: true, email: true },
      },
    },
  });

  if (pendingExpenses.length === 0) {
    console.log('❌ No expenses with SUBMITTED or PENDING_APPROVAL status found.');
    console.log('   → User needs to create and submit a new expense first.\n');
  } else {
    for (const exp of pendingExpenses) {
      console.log(`\n   Expense: ${exp.expenseNumber}`);
      console.log(`   Status: ${exp.status}`);
      console.log(`   Amount: ${exp.amount} ${exp.currency}`);
      console.log(`   amountInPKR: ${exp.amountInPKR ?? 'NULL ⚠️'}`);
      console.log(`   totalAmount: ${exp.totalAmount}`);
      console.log(`   Submitter: ${exp.submitter.firstName} ${exp.submitter.lastName} (${exp.submitter.email})`);
      console.log(`   Submitted At: ${exp.submittedAt}`);
    }
    console.log(`\n   Total: ${pendingExpenses.length} pending expense(s)\n`);
  }

  // 2. Check approval tiers
  console.log('\n2. APPROVAL TIERS:');
  console.log('==================');
  const tiers = await prisma.approvalTier.findMany({
    where: { isActive: true },
    orderBy: { tierOrder: 'asc' },
  });

  for (const tier of tiers) {
    console.log(`   Tier ${tier.tierOrder}: ${tier.name}`);
    console.log(`   Range: ${tier.minAmount} - ${tier.maxAmount ?? 'unlimited'} PKR`);
    console.log(`   Required Role: ${tier.approverRole}\n`);
  }

  // 3. Check users with APPROVER role
  console.log('\n3. USERS WITH APPROVER ROLE:');
  console.log('============================');
  const approvers = await prisma.user.findMany({
    where: { role: RoleType.APPROVER },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      role: true,
      departmentId: true,
    },
  });

  for (const user of approvers) {
    console.log(`   ${user.firstName} ${user.lastName} (${user.email})`);
    console.log(`   Role: ${user.role}`);
    console.log(`   ID: ${user.id}\n`);
  }

  // 4. Show which expenses would match which tier
  console.log('\n4. EXPENSE-TO-TIER MATCHING:');
  console.log('============================');
  for (const exp of pendingExpenses) {
    const pkrAmount = exp.amountInPKR ?? exp.amount;
    const matchingTier = tiers.find(
      (tier) =>
        tier.minAmount.toNumber() <= pkrAmount.toNumber() &&
        (tier.maxAmount === null || tier.maxAmount.toNumber() >= pkrAmount.toNumber())
    );

    console.log(`\n   ${exp.expenseNumber}:`);
    console.log(`   PKR Amount: ${pkrAmount}`);
    if (matchingTier) {
      console.log(`   Matched Tier: ${matchingTier.name}`);
      console.log(`   Required Role: ${matchingTier.approverRole}`);
    } else {
      console.log(`   ⚠️ NO MATCHING TIER FOUND!`);
    }
  }

  // 5. Check approval history
  console.log('\n\n5. RECENT APPROVAL HISTORY:');
  console.log('===========================');
  const history = await prisma.approvalHistory.findMany({
    take: 10,
    orderBy: { createdAt: 'desc' },
    include: {
      expense: { select: { expenseNumber: true } },
      approver: { select: { firstName: true, lastName: true } },
    },
  });

  if (history.length === 0) {
    console.log('   No approval history found.\n');
  } else {
    for (const h of history) {
      console.log(`   ${h.expense.expenseNumber}: ${h.action} by ${h.approver.firstName} ${h.approver.lastName} at tier ${h.tierLevel}`);
    }
  }

  console.log('\n✅ Diagnostic complete!\n');
}

main()
  .catch((e) => {
    console.error('Error:', e);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
