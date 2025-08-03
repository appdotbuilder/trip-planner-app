
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, tripsTable, expensesTable, expenseSplitsTable } from '../db/schema';
import { getTripExpenses } from '../handlers/get_trip_expenses';

describe('getTripExpenses', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return expenses with splits for a trip', async () => {
    // Create test user
    const users = await db.insert(usersTable)
      .values([
        {
          email: 'user1@test.com',
          username: 'user1',
          password_hash: 'hash1'
        },
        {
          email: 'user2@test.com',
          username: 'user2',
          password_hash: 'hash2'
        }
      ])
      .returning()
      .execute();

    // Create test trip
    const trips = await db.insert(tripsTable)
      .values({
        user_id: users[0].id,
        title: 'Test Trip',
        destination: 'Test Destination',
        start_date: new Date('2024-01-01'),
        end_date: new Date('2024-01-07')
      })
      .returning()
      .execute();

    // Create test expenses
    const expenses = await db.insert(expensesTable)
      .values([
        {
          trip_id: trips[0].id,
          payer_id: users[0].id,
          title: 'Hotel',
          amount: '200.50',
          currency: 'USD',
          category: 'accommodation',
          expense_date: new Date('2024-01-01')
        },
        {
          trip_id: trips[0].id,
          payer_id: users[1].id,
          title: 'Dinner',
          amount: '85.75',
          currency: 'USD',
          category: 'food',
          expense_date: new Date('2024-01-02')
        }
      ])
      .returning()
      .execute();

    // Create expense splits
    await db.insert(expenseSplitsTable)
      .values([
        {
          expense_id: expenses[0].id,
          user_id: users[0].id,
          amount: '100.25'
        },
        {
          expense_id: expenses[0].id,
          user_id: users[1].id,
          amount: '100.25'
        },
        {
          expense_id: expenses[1].id,
          user_id: users[0].id,
          amount: '42.88'
        },
        {
          expense_id: expenses[1].id,
          user_id: users[1].id,
          amount: '42.87'
        }
      ])
      .execute();

    const result = await getTripExpenses(trips[0].id);

    // Verify basic structure
    expect(result).toHaveLength(2);
    expect(result[0].splits).toBeDefined();
    expect(result[1].splits).toBeDefined();

    // Find hotel expense
    const hotelExpense = result.find(exp => exp.title === 'Hotel');
    expect(hotelExpense).toBeDefined();
    expect(hotelExpense!.amount).toEqual(200.50);
    expect(typeof hotelExpense!.amount).toBe('number');
    expect(hotelExpense!.currency).toEqual('USD');
    expect(hotelExpense!.category).toEqual('accommodation');
    expect(hotelExpense!.splits).toHaveLength(2);

    // Verify splits for hotel expense
    const hotelSplits = hotelExpense!.splits;
    expect(hotelSplits[0].amount).toEqual(100.25);
    expect(typeof hotelSplits[0].amount).toBe('number');
    expect(hotelSplits[0].is_settled).toEqual(false);

    // Find dinner expense
    const dinnerExpense = result.find(exp => exp.title === 'Dinner');
    expect(dinnerExpense).toBeDefined();
    expect(dinnerExpense!.amount).toEqual(85.75);
    expect(dinnerExpense!.category).toEqual('food');
    expect(dinnerExpense!.splits).toHaveLength(2);
  });

  it('should return empty array for trip with no expenses', async () => {
    // Create test user and trip without expenses
    const users = await db.insert(usersTable)
      .values({
        email: 'user@test.com',
        username: 'user',
        password_hash: 'hash'
      })
      .returning()
      .execute();

    const trips = await db.insert(tripsTable)
      .values({
        user_id: users[0].id,
        title: 'Empty Trip',
        destination: 'Test Destination',
        start_date: new Date('2024-01-01'),
        end_date: new Date('2024-01-07')
      })
      .returning()
      .execute();

    const result = await getTripExpenses(trips[0].id);

    expect(result).toEqual([]);
  });

  it('should return expenses with empty splits array when no splits exist', async () => {
    // Create test user
    const users = await db.insert(usersTable)
      .values({
        email: 'user@test.com',
        username: 'user',
        password_hash: 'hash'
      })
      .returning()
      .execute();

    // Create test trip
    const trips = await db.insert(tripsTable)
      .values({
        user_id: users[0].id,
        title: 'Test Trip',
        destination: 'Test Destination',
        start_date: new Date('2024-01-01'),
        end_date: new Date('2024-01-07')
      })
      .returning()
      .execute();

    // Create expense without splits
    await db.insert(expensesTable)
      .values({
        trip_id: trips[0].id,
        payer_id: users[0].id,
        title: 'Solo Expense',
        amount: '50.00',
        currency: 'USD',
        category: 'other',
        expense_date: new Date('2024-01-01')
      })
      .execute();

    const result = await getTripExpenses(trips[0].id);

    expect(result).toHaveLength(1);
    expect(result[0].title).toEqual('Solo Expense');
    expect(result[0].amount).toEqual(50.00);
    expect(result[0].splits).toEqual([]);
  });

  it('should handle non-existent trip', async () => {
    const result = await getTripExpenses(999);
    expect(result).toEqual([]);
  });
});
