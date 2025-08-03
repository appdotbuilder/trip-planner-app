
import { db } from '../db';
import { expenseSplitsTable } from '../db/schema';
import { eq, and } from 'drizzle-orm';

export const settleExpense = async (expenseId: number, userId: number): Promise<{ success: boolean }> => {
  try {
    // Update the expense split to mark it as settled
    const result = await db.update(expenseSplitsTable)
      .set({ 
        is_settled: true 
      })
      .where(and(
        eq(expenseSplitsTable.expense_id, expenseId),
        eq(expenseSplitsTable.user_id, userId)
      ))
      .returning()
      .execute();

    // Return success true if a record was updated
    return { success: result.length > 0 };
  } catch (error) {
    console.error('Expense settlement failed:', error);
    throw error;
  }
};
