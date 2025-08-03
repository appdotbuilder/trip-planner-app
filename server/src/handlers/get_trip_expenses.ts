
import { db } from '../db';
import { expensesTable, expenseSplitsTable } from '../db/schema';
import { type Expense, type ExpenseSplit } from '../schema';
import { eq } from 'drizzle-orm';

export const getTripExpenses = async (tripId: number): Promise<(Expense & { splits: ExpenseSplit[] })[]> => {
  try {
    // Get all expenses for the trip
    const expenses = await db.select()
      .from(expensesTable)
      .where(eq(expensesTable.trip_id, tripId))
      .execute();

    // Convert numeric fields back to numbers
    const expensesWithNumbers = expenses.map(expense => ({
      ...expense,
      amount: parseFloat(expense.amount)
    }));

    // Get all splits for these expenses
    const expenseIds = expensesWithNumbers.map(expense => expense.id);
    
    let splits: any[] = [];
    if (expenseIds.length > 0) {
      splits = await db.select()
        .from(expenseSplitsTable)
        .where(eq(expenseSplitsTable.expense_id, expenseIds[0])) // Start with first expense
        .execute();

      // Get splits for all expenses (if multiple)
      for (let i = 1; i < expenseIds.length; i++) {
        const additionalSplits = await db.select()
          .from(expenseSplitsTable)
          .where(eq(expenseSplitsTable.expense_id, expenseIds[i]))
          .execute();
        splits = splits.concat(additionalSplits);
      }
    }

    // Convert numeric fields in splits
    const splitsWithNumbers = splits.map(split => ({
      ...split,
      amount: parseFloat(split.amount)
    }));

    // Group splits by expense_id
    const splitsByExpenseId = splitsWithNumbers.reduce((acc, split) => {
      if (!acc[split.expense_id]) {
        acc[split.expense_id] = [];
      }
      acc[split.expense_id].push(split);
      return acc;
    }, {} as Record<number, ExpenseSplit[]>);

    // Combine expenses with their splits
    return expensesWithNumbers.map(expense => ({
      ...expense,
      splits: splitsByExpenseId[expense.id] || []
    }));
  } catch (error) {
    console.error('Failed to get trip expenses:', error);
    throw error;
  }
};
