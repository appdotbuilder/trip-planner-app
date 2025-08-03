
import { db } from '../db';
import { expensesTable, expenseSplitsTable } from '../db/schema';
import { eq, and, sum, ne } from 'drizzle-orm';

export const getUserExpenseSummary = async (tripId: number, userId: number): Promise<{ owes: number; owed: number; currency: string }> => {
  try {
    // Get all expenses for the trip to determine the most common currency
    const tripExpenses = await db.select({
      currency: expensesTable.currency
    })
    .from(expensesTable)
    .where(eq(expensesTable.trip_id, tripId))
    .execute();

    // Determine the primary currency (most frequently used)
    const currencyCount = tripExpenses.reduce((acc, expense) => {
      acc[expense.currency] = (acc[expense.currency] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const primaryCurrency = Object.keys(currencyCount).length > 0 
      ? Object.keys(currencyCount).reduce((a, b) => currencyCount[a] > currencyCount[b] ? a : b)
      : 'USD';

    // Calculate what the user owes (their unsettled expense splits)
    const owesResult = await db.select({
      total: sum(expenseSplitsTable.amount)
    })
    .from(expenseSplitsTable)
    .innerJoin(expensesTable, eq(expenseSplitsTable.expense_id, expensesTable.id))
    .where(
      and(
        eq(expensesTable.trip_id, tripId),
        eq(expenseSplitsTable.user_id, userId),
        eq(expenseSplitsTable.is_settled, false),
        ne(expensesTable.payer_id, userId) // Only include splits where user didn't pay
      )
    )
    .execute();

    // Calculate what the user is owed (expenses they paid for others who haven't settled)
    const owedResult = await db.select({
      total: sum(expenseSplitsTable.amount)
    })
    .from(expenseSplitsTable)
    .innerJoin(expensesTable, eq(expenseSplitsTable.expense_id, expensesTable.id))
    .where(
      and(
        eq(expensesTable.trip_id, tripId),
        eq(expensesTable.payer_id, userId),
        eq(expenseSplitsTable.is_settled, false),
        ne(expenseSplitsTable.user_id, userId) // Exclude the payer's own split
      )
    )
    .execute();

    const owes = owesResult[0]?.total ? parseFloat(owesResult[0].total) : 0;
    const owed = owedResult[0]?.total ? parseFloat(owedResult[0].total) : 0;

    return {
      owes,
      owed,
      currency: primaryCurrency
    };
  } catch (error) {
    console.error('Get user expense summary failed:', error);
    throw error;
  }
};
