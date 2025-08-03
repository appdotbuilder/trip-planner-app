
import { db } from '../db';
import { expensesTable, expenseSplitsTable } from '../db/schema';
import { type CreateExpenseInput, type Expense } from '../schema';

export const createExpense = async (input: CreateExpenseInput): Promise<Expense> => {
  try {
    // Insert the expense record
    const expenseResult = await db.insert(expensesTable)
      .values({
        trip_id: input.trip_id,
        payer_id: input.payer_id,
        title: input.title,
        description: input.description,
        amount: input.amount.toString(), // Convert number to string for numeric column
        currency: input.currency,
        category: input.category,
        expense_date: input.expense_date
      })
      .returning()
      .execute();

    const expense = expenseResult[0];

    // Insert expense splits
    if (input.split_with.length > 0) {
      const splitValues = input.split_with.map(split => ({
        expense_id: expense.id,
        user_id: split.user_id,
        amount: split.amount.toString(), // Convert number to string for numeric column
        is_settled: false
      }));

      await db.insert(expenseSplitsTable)
        .values(splitValues)
        .execute();
    }

    // Convert numeric field back to number before returning
    return {
      ...expense,
      amount: parseFloat(expense.amount)
    };
  } catch (error) {
    console.error('Expense creation failed:', error);
    throw error;
  }
};
