
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, tripsTable, expensesTable, expenseSplitsTable } from '../db/schema';
import { type CreateExpenseInput } from '../schema';
import { createExpense } from '../handlers/create_expense';
import { eq } from 'drizzle-orm';

describe('createExpense', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create an expense with splits', async () => {
    // Create prerequisite user and trip
    const userResult = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        username: 'testuser',
        password_hash: 'hashedpassword',
        first_name: 'Test',
        last_name: 'User'
      })
      .returning()
      .execute();

    const user = userResult[0];

    const tripResult = await db.insert(tripsTable)
      .values({
        user_id: user.id,
        title: 'Test Trip',
        destination: 'Test City',
        start_date: new Date('2024-06-01'),
        end_date: new Date('2024-06-07'),
        is_public: false
      })
      .returning()
      .execute();

    const trip = tripResult[0];

    // Create another user for splitting
    const user2Result = await db.insert(usersTable)
      .values({
        email: 'user2@example.com',
        username: 'user2',
        password_hash: 'hashedpassword2',
        first_name: 'User',
        last_name: 'Two'
      })
      .returning()
      .execute();

    const user2 = user2Result[0];

    const testInput: CreateExpenseInput = {
      trip_id: trip.id,
      payer_id: user.id,
      title: 'Dinner at Restaurant',
      description: 'Group dinner on first night',
      amount: 120.50,
      currency: 'USD',
      category: 'food',
      expense_date: new Date('2024-06-01'),
      split_with: [
        { user_id: user.id, amount: 60.25 },
        { user_id: user2.id, amount: 60.25 }
      ]
    };

    const result = await createExpense(testInput);

    // Verify expense fields
    expect(result.id).toBeDefined();
    expect(result.trip_id).toEqual(trip.id);
    expect(result.payer_id).toEqual(user.id);
    expect(result.title).toEqual('Dinner at Restaurant');
    expect(result.description).toEqual('Group dinner on first night');
    expect(result.amount).toEqual(120.50);
    expect(typeof result.amount).toBe('number');
    expect(result.currency).toEqual('USD');
    expect(result.category).toEqual('food');
    expect(result.expense_date).toBeInstanceOf(Date);
    expect(result.created_at).toBeInstanceOf(Date);
  });

  it('should save expense to database', async () => {
    // Create prerequisite user and trip
    const userResult = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        username: 'testuser',
        password_hash: 'hashedpassword',
        first_name: 'Test',
        last_name: 'User'
      })
      .returning()
      .execute();

    const user = userResult[0];

    const tripResult = await db.insert(tripsTable)
      .values({
        user_id: user.id,
        title: 'Test Trip',
        destination: 'Test City',
        start_date: new Date('2024-06-01'),
        end_date: new Date('2024-06-07'),
        is_public: false
      })
      .returning()
      .execute();

    const trip = tripResult[0];

    const testInput: CreateExpenseInput = {
      trip_id: trip.id,
      payer_id: user.id,
      title: 'Hotel Booking',
      description: 'Accommodation for 3 nights',
      amount: 450.00,
      currency: 'USD',
      category: 'accommodation',
      expense_date: new Date('2024-06-01'),
      split_with: [
        { user_id: user.id, amount: 450.00 }
      ]
    };

    const result = await createExpense(testInput);

    // Verify expense was saved to database
    const expenses = await db.select()
      .from(expensesTable)
      .where(eq(expensesTable.id, result.id))
      .execute();

    expect(expenses).toHaveLength(1);
    expect(expenses[0].title).toEqual('Hotel Booking');
    expect(expenses[0].description).toEqual('Accommodation for 3 nights');
    expect(parseFloat(expenses[0].amount)).toEqual(450.00);
    expect(expenses[0].currency).toEqual('USD');
    expect(expenses[0].category).toEqual('accommodation');
    expect(expenses[0].created_at).toBeInstanceOf(Date);
  });

  it('should create expense splits correctly', async () => {
    // Create prerequisite users and trip
    const userResult = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        username: 'testuser',
        password_hash: 'hashedpassword',
        first_name: 'Test',
        last_name: 'User'
      })
      .returning()
      .execute();

    const user = userResult[0];

    const user2Result = await db.insert(usersTable)
      .values({
        email: 'user2@example.com',
        username: 'user2',
        password_hash: 'hashedpassword2',
        first_name: 'User',
        last_name: 'Two'
      })
      .returning()
      .execute();

    const user2 = user2Result[0];

    const user3Result = await db.insert(usersTable)
      .values({
        email: 'user3@example.com',
        username: 'user3',
        password_hash: 'hashedpassword3',
        first_name: 'User',
        last_name: 'Three'
      })
      .returning()
      .execute();

    const user3 = user3Result[0];

    const tripResult = await db.insert(tripsTable)
      .values({
        user_id: user.id,
        title: 'Test Trip',
        destination: 'Test City',
        start_date: new Date('2024-06-01'),
        end_date: new Date('2024-06-07'),
        is_public: false
      })
      .returning()
      .execute();

    const trip = tripResult[0];

    const testInput: CreateExpenseInput = {
      trip_id: trip.id,
      payer_id: user.id,
      title: 'Group Activity',
      description: 'Museum tickets for everyone',
      amount: 75.00,
      currency: 'USD',
      category: 'entertainment',
      expense_date: new Date('2024-06-02'),
      split_with: [
        { user_id: user.id, amount: 25.00 },
        { user_id: user2.id, amount: 25.00 },
        { user_id: user3.id, amount: 25.00 }
      ]
    };

    const result = await createExpense(testInput);

    // Verify expense splits were created
    const splits = await db.select()
      .from(expenseSplitsTable)
      .where(eq(expenseSplitsTable.expense_id, result.id))
      .execute();

    expect(splits).toHaveLength(3);
    
    // Check each split
    const splitsByUserId = splits.reduce((acc, split) => {
      acc[split.user_id] = split;
      return acc;
    }, {} as Record<number, any>);

    expect(parseFloat(splitsByUserId[user.id].amount)).toEqual(25.00);
    expect(splitsByUserId[user.id].is_settled).toBe(false);
    
    expect(parseFloat(splitsByUserId[user2.id].amount)).toEqual(25.00);
    expect(splitsByUserId[user2.id].is_settled).toBe(false);
    
    expect(parseFloat(splitsByUserId[user3.id].amount)).toEqual(25.00);
    expect(splitsByUserId[user3.id].is_settled).toBe(false);
  });

  it('should handle expense with no splits', async () => {
    // Create prerequisite user and trip
    const userResult = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        username: 'testuser',
        password_hash: 'hashedpassword',
        first_name: 'Test',
        last_name: 'User'
      })
      .returning()
      .execute();

    const user = userResult[0];

    const tripResult = await db.insert(tripsTable)
      .values({
        user_id: user.id,
        title: 'Test Trip',
        destination: 'Test City',
        start_date: new Date('2024-06-01'),
        end_date: new Date('2024-06-07'),
        is_public: false
      })
      .returning()
      .execute();

    const trip = tripResult[0];

    const testInput: CreateExpenseInput = {
      trip_id: trip.id,
      payer_id: user.id,
      title: 'Personal Expense',
      description: 'Solo coffee break',
      amount: 5.50,
      currency: 'USD',
      category: 'food',
      expense_date: new Date('2024-06-02'),
      split_with: []
    };

    const result = await createExpense(testInput);

    // Verify expense was created
    expect(result.id).toBeDefined();
    expect(result.title).toEqual('Personal Expense');
    expect(result.amount).toEqual(5.50);

    // Verify no splits were created
    const splits = await db.select()
      .from(expenseSplitsTable)
      .where(eq(expenseSplitsTable.expense_id, result.id))
      .execute();

    expect(splits).toHaveLength(0);
  });
});
