
import { db } from '../db';
import { remindersTable } from '../db/schema';
import { type CreateReminderInput, type Reminder } from '../schema';

export const createReminder = async (input: CreateReminderInput): Promise<Reminder> => {
  try {
    // Insert reminder record
    const result = await db.insert(remindersTable)
      .values({
        user_id: input.user_id,
        trip_id: input.trip_id,
        activity_id: input.activity_id,
        title: input.title,
        message: input.message,
        reminder_time: input.reminder_time
      })
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('Reminder creation failed:', error);
    throw error;
  }
};
