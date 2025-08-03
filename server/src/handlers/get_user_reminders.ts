
import { db } from '../db';
import { remindersTable } from '../db/schema';
import { eq, gte, asc } from 'drizzle-orm';
import { type Reminder } from '../schema';

export const getUserReminders = async (userId: number): Promise<Reminder[]> => {
  try {
    const now = new Date();
    
    const results = await db.select()
      .from(remindersTable)
      .where(eq(remindersTable.user_id, userId))
      .orderBy(asc(remindersTable.reminder_time))
      .execute();

    // No numeric conversions needed - all fields are non-numeric
    return results;
  } catch (error) {
    console.error('Failed to fetch user reminders:', error);
    throw error;
  }
};
