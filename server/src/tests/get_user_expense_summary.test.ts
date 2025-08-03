
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, tripsTable, expensesTable, expenseSplitsTable } from '../db/schema';
import { getUserExpenseSummary } from '../handlers/get_user_expense_summary';

// Test data
const testUser1 = {
  email: 'user1@example.com',
  username: 'user1',
  password_hash: 'hash1',
  first_name: 'User',
  last_name: 'One'
};

const testUser2 = {
  email: 'user2@example.com',
  username: 'user2',
  password_hash: 'hash2',
  first_name: 'User',
  last_name: 'Two'
};

const testTrip = {
  user_id: 1,
  title: 'Test Trip',
  description: 'A test trip',
  destination: 'Test City',
  start_date: new Date('2024-01-01'),
  end_date: new Date('2024-01-07'),
  is_public: false
};

describe('getUserExpenseSummary', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return zero amounts when no expenses exist', async () => {
    // Create users and trip
    const users = await db.insert(usersTable)
      .values([testUser1, testUser2])
      .returning()
      .execute();

    const trips = await db.insert(tripsTable)
      .values(testTrip)
      .returning()
      .execute();

    const result = await getUserExpenseSummary(trips[0].id, users[0].id);

    expect(result.owes).toBe(0);
    expect(result.owed).toBe(0);
    expect(result.currency).toBe('USD');
  });

  it('should calculate what user owes correctly', async () => {
    // Create users and trip
    const users = await db.insert(usersTable)
      .values([testUser1, testUser2])
      .returning()
      .execute();

    const trips = await db.insert(tripsTable)
      .values(testTrip)
      .returning()
      .execute();

    // Create expense paid by user2
    const expenses = await db.insert(expensesTable)
      .values({
        trip_id: trips[0].id,
        payer_id: users[1].id, // User2 paid
        title: 'Dinner',
        description: 'Group dinner',
        amount: '100.00',
        currency: 'USD',
        category: 'food',
        expense_date: new Date('2024-01-02')
      })
      .returning()
      .execute();

    // Create splits - user1 owes $50
    await db.insert(expenseSplitsTable)
      .values([
        {
          expense_id: expenses[0].id,
          user_id: users[0].id, // User1 owes
          amount: '50.00',
          is_settled: false
        },
        {
          expense_id: expenses[0].id,
          user_id: users[1].id, // User2's own share
          amount: '50.00',
          is_settled: false
        }
      ])
      .execute();

    const result = await getUserExpenseSummary(trips[0].id, users[0].id);

    expect(result.owes).toBe(50);
    expect(result.owed).toBe(0);
    expect(result.currency).toBe('USD');
  });

  it('should calculate what user is owed correctly', async () => {
    // Create users and trip
    const users = await db.insert(usersTable)
      .values([testUser1, testUser2])
      .returning()
      .execute();

    const trips = await db.insert(tripsTable)
      .values(testTrip)
      .returning()
      .execute();

    // Create expense paid by user1
    const expenses = await db.insert(expensesTable)
      .values({
        trip_id: trips[0].id,
        payer_id: users[0].id, // User1 paid
        title: 'Hotel',
        description: 'Hotel booking',
        amount: '200.00',
        currency: 'EUR',
        category: 'accommodation',
        expense_date: new Date('2024-01-01')
      })
      .returning()
      .execute();

    // Create splits - user2 owes user1 $100
    await db.insert(expenseSplitsTable)
      .values([
        {
          expense_id: expenses[0].id,
          user_id: users[0].id, // User1's own share
          amount: '100.00',
          is_settled: false
        },
        {
          expense_id: expenses[0].id,
          user_id: users[1].id, // User2 owes
          amount: '100.00',
          is_settled: false
        }
      ])
      .execute();

    const result = await getUserExpenseSummary(trips[0].id, users[0].id);

    expect(result.owes).toBe(0);
    expect(result.owed).toBe(100);
    expect(result.currency).toBe('EUR');
  });

  it('should handle settled expenses correctly', async () => {
    // Create users and trip
    const users = await db.insert(usersTable)
      .values([testUser1, testUser2])
      .returning()
      .execute();

    const trips = await db.insert(tripsTable)
      .values(testTrip)
      .returning()
      .execute();

    // Create expense
    const expenses = await db.insert(expensesTable)
      .values({
        trip_id: trips[0].id,
        payer_id: users[1].id, // User2 paid
        title: 'Transport',
        description: 'Bus tickets',
        amount: '60.00',
        currency: 'USD',
        category: 'transport',
        expense_date: new Date('2024-01-03')
      })
      .returning()
      .execute();

    // Create splits - one settled, one not
    await db.insert(expenseSplitsTable)
      .values([
        {
          expense_id: expenses[0].id,
          user_id: users[0].id, // User1 owes but settled
          amount: '30.00',
          is_settled: true
        },
        {
          expense_id: expenses[0].id,
          user_id: users[1].id, // User2's own share
          amount: '30.00',
          is_settled: false
        }
      ])
      .execute();

    const result = await getUserExpenseSummary(trips[0].id, users[0].id);

    expect(result.owes).toBe(0); // Settled, so doesn't owe anything
    expect(result.owed).toBe(0);
    expect(result.currency).toBe('USD');
  });

  it('should calculate complex scenarios with multiple expenses', async () => {
    // Create users and trip
    const users = await db.insert(usersTable)
      .values([testUser1, testUser2])
      .returning()
      .execute();

    const trips = await db.insert(tripsTable)
      .values(testTrip)
      .returning()
      .execute();

    // User1 paid for lunch
    const expense1 = await db.insert(expensesTable)
      .values({
        trip_id: trips[0].id,
        payer_id: users[0].id,
        title: 'Lunch',
        description: 'Group lunch',
        amount: '80.00',
        currency: 'USD',
        category: 'food',
        expense_date: new Date('2024-01-02')
      })
      .returning()
      .execute();

    // User2 paid for dinner
    const expense2 = await db.insert(expensesTable)
      .values({
        trip_id: trips[0].id,
        payer_id: users[1].id,
        title: 'Dinner',
        description: 'Group dinner',
        amount: '120.00',
        currency: 'USD',
        category: 'food',
        expense_date: new Date('2024-01-02')
      })
      .returning()
      .execute();

    // Create splits for lunch (user1 is owed $40)
    await db.insert(expenseSplitsTable)
      .values([
        {
          expense_id: expense1[0].id,
          user_id: users[0].id,
          amount: '40.00',
          is_settled: false
        },
        {
          expense_id: expense1[0].id,
          user_id: users[1].id,
          amount: '40.00',
          is_settled: false
        }
      ])
      .execute();

    // Create splits for dinner (user1 owes $60)
    await db.insert(expenseSplitsTable)
      .values([
        {
          expense_id: expense2[0].id,
          user_id: users[0].id,
          amount: '60.00',
          is_settled: false
        },
        {
          expense_id: expense2[0].id,
          user_id: users[1].id,
          amount: '60.00',
          is_settled: false
        }
      ])
      .execute();

    const result = await getUserExpenseSummary(trips[0].id, users[0].id);

    expect(result.owes).toBe(60); // Owes $60 for dinner
    expect(result.owed).toBe(40); // Owed $40 for lunch
    expect(result.currency).toBe('USD');
  });

  it('should use most common currency when multiple currencies exist', async () => {
    // Create users and trip
    const users = await db.insert(usersTable)
      .values([testUser1, testUser2])
      .returning()
      .execute();

    const trips = await db.insert(tripsTable)
      .values(testTrip)
      .returning()
      .execute();

    // Create expenses with different currencies
    await db.insert(expensesTable)
      .values([
        {
          trip_id: trips[0].id,
          payer_id: users[0].id,
          title: 'Expense 1',
          description: 'EUR expense',
          amount: '50.00',
          currency: 'EUR',
          category: 'food',
          expense_date: new Date('2024-01-01')
        },
        {
          trip_id: trips[0].id,
          payer_id: users[0].id,
          title: 'Expense 2',
          description: 'USD expense 1',
          amount: '75.00',
          currency: 'USD',
          category: 'food',
          expense_date: new Date('2024-01-02')
        },
        {
          trip_id: trips[0].id,
          payer_id: users[0].id,
          title: 'Expense 3',
          description: 'USD expense 2',
          amount: '100.00',
          currency: 'USD',
          category: 'transport',
          expense_date: new Date('2024-01-03')
        }
      ])
      .execute();

    const result = await getUserExpenseSummary(trips[0].id, users[0].id);

    expect(result.currency).toBe('USD'); // USD appears twice, EUR once
  });

  it('should not include own expense splits when calculating what user owes', async () => {
    // Create users and trip
    const users = await db.insert(usersTable)
      .values([testUser1, testUser2])
      .returning()
      .execute();

    const trips = await db.insert(tripsTable)
      .values(testTrip)
      .returning()
      .execute();

    // User1 paid for their own expense
    const expenses = await db.insert(expensesTable)
      .values({
        trip_id: trips[0].id,
        payer_id: users[0].id, // User1 paid
        title: 'Personal Item',
        description: 'Something just for user1',
        amount: '50.00',
        currency: 'USD',
        category: 'shopping',
        expense_date: new Date('2024-01-02')
      })
      .returning()
      .execute();

    // User1 has their own split
    await db.insert(expenseSplitsTable)
      .values({
        expense_id: expenses[0].id,
        user_id: users[0].id, // User1's own split
        amount: '50.00',
        is_settled: false
      })
      .execute();

    const result = await getUserExpenseSummary(trips[0].id, users[0].id);

    expect(result.owes).toBe(0); // Should not owe themselves
    expect(result.owed).toBe(0); // No one else owes them
    expect(result.currency).toBe('USD');
  });
});
