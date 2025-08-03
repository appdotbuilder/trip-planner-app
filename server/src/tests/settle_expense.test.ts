
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, tripsTable, expensesTable, expenseSplitsTable } from '../db/schema';
import { settleExpense } from '../handlers/settle_expense';
import { eq, and } from 'drizzle-orm';

describe('settleExpense', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should settle an expense split successfully', async () => {
    // Create test user
    const user = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        username: 'testuser',
        password_hash: 'hashedpassword',
        first_name: 'Test',
        last_name: 'User'
      })
      .returning()
      .execute();

    // Create test trip
    const trip = await db.insert(tripsTable)
      .values({
        user_id: user[0].id,
        title: 'Test Trip',
        destination: 'Test Destination',
        start_date: new Date(),
        end_date: new Date(),
        is_public: false
      })
      .returning()
      .execute();

    // Create test expense
    const expense = await db.insert(expensesTable)
      .values({
        trip_id: trip[0].id,
        payer_id: user[0].id,
        title: 'Test Expense',
        description: 'A test expense',
        amount: '100.00',
        currency: 'USD',
        category: 'food',
        expense_date: new Date()
      })
      .returning()
      .execute();

    // Create expense split (unsettled)
    const split = await db.insert(expenseSplitsTable)
      .values({
        expense_id: expense[0].id,
        user_id: user[0].id,
        amount: '50.00',
        is_settled: false
      })
      .returning()
      .execute();

    // Settle the expense
    const result = await settleExpense(expense[0].id, user[0].id);

    // Verify result
    expect(result.success).toBe(true);

    // Verify the split is marked as settled in database
    const updatedSplit = await db.select()
      .from(expenseSplitsTable)
      .where(eq(expenseSplitsTable.id, split[0].id))
      .execute();

    expect(updatedSplit).toHaveLength(1);
    expect(updatedSplit[0].is_settled).toBe(true);
  });

  it('should return false when expense split does not exist', async () => {
    // Try to settle non-existent expense
    const result = await settleExpense(999, 999);

    expect(result.success).toBe(false);
  });

  it('should only settle expense split for specific user', async () => {
    // Create test users
    const user1 = await db.insert(usersTable)
      .values({
        email: 'user1@example.com',
        username: 'user1',
        password_hash: 'hashedpassword',
        first_name: 'User',
        last_name: 'One'
      })
      .returning()
      .execute();

    const user2 = await db.insert(usersTable)
      .values({
        email: 'user2@example.com',
        username: 'user2',
        password_hash: 'hashedpassword',
        first_name: 'User',
        last_name: 'Two'
      })
      .returning()
      .execute();

    // Create test trip
    const trip = await db.insert(tripsTable)
      .values({
        user_id: user1[0].id,
        title: 'Test Trip',
        destination: 'Test Destination',
        start_date: new Date(),
        end_date: new Date(),
        is_public: false
      })
      .returning()
      .execute();

    // Create test expense
    const expense = await db.insert(expensesTable)
      .values({
        trip_id: trip[0].id,
        payer_id: user1[0].id,
        title: 'Test Expense',
        description: 'A test expense',
        amount: '100.00',
        currency: 'USD',
        category: 'food',
        expense_date: new Date()
      })
      .returning()
      .execute();

    // Create expense splits for both users
    const split1 = await db.insert(expenseSplitsTable)
      .values({
        expense_id: expense[0].id,
        user_id: user1[0].id,
        amount: '50.00',
        is_settled: false
      })
      .returning()
      .execute();

    const split2 = await db.insert(expenseSplitsTable)
      .values({
        expense_id: expense[0].id,
        user_id: user2[0].id,
        amount: '50.00',
        is_settled: false
      })
      .returning()
      .execute();

    // Settle expense for user1 only
    const result = await settleExpense(expense[0].id, user1[0].id);

    expect(result.success).toBe(true);

    // Verify only user1's split is settled
    const splits = await db.select()
      .from(expenseSplitsTable)
      .where(eq(expenseSplitsTable.expense_id, expense[0].id))
      .execute();

    expect(splits).toHaveLength(2);
    
    const user1Split = splits.find(s => s.user_id === user1[0].id);
    const user2Split = splits.find(s => s.user_id === user2[0].id);

    expect(user1Split?.is_settled).toBe(true);
    expect(user2Split?.is_settled).toBe(false);
  });

  it('should handle already settled expense split', async () => {
    // Create test user
    const user = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        username: 'testuser',
        password_hash: 'hashedpassword',
        first_name: 'Test',
        last_name: 'User'
      })
      .returning()
      .execute();

    // Create test trip
    const trip = await db.insert(tripsTable)
      .values({
        user_id: user[0].id,
        title: 'Test Trip',
        destination: 'Test Destination',
        start_date: new Date(),
        end_date: new Date(),
        is_public: false
      })
      .returning()
      .execute();

    // Create test expense
    const expense = await db.insert(expensesTable)
      .values({
        trip_id: trip[0].id,
        payer_id: user[0].id,
        title: 'Test Expense',
        description: 'A test expense',
        amount: '100.00',
        currency: 'USD',
        category: 'food',
        expense_date: new Date()
      })
      .returning()
      .execute();

    // Create expense split (already settled)
    await db.insert(expenseSplitsTable)
      .values({
        expense_id: expense[0].id,
        user_id: user[0].id,
        amount: '50.00',
        is_settled: true
      })
      .returning()
      .execute();

    // Try to settle already settled expense
    const result = await settleExpense(expense[0].id, user[0].id);

    // Should still return success as the operation completed
    expect(result.success).toBe(true);
  });
});
