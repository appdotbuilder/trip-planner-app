
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, tripsTable, dailyItinerariesTable, activitiesTable, remindersTable } from '../db/schema';
import { type CreateReminderInput } from '../schema';
import { createReminder } from '../handlers/create_reminder';
import { eq } from 'drizzle-orm';

describe('createReminder', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  let testUserId: number;
  let testTripId: number;
  let testActivityId: number;

  beforeEach(async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        username: 'testuser',
        password_hash: 'hashed_password'
      })
      .returning()
      .execute();
    testUserId = userResult[0].id;

    // Create test trip
    const tripResult = await db.insert(tripsTable)
      .values({
        user_id: testUserId,
        title: 'Test Trip',
        destination: 'Test Destination',
        start_date: new Date('2024-01-01'),
        end_date: new Date('2024-01-07')
      })
      .returning()
      .execute();
    testTripId = tripResult[0].id;

    // Create test daily itinerary
    const itineraryResult = await db.insert(dailyItinerariesTable)
      .values({
        trip_id: testTripId,
        date: new Date('2024-01-01'),
        title: 'Day 1'
      })
      .returning()
      .execute();

    // Create test activity
    const activityResult = await db.insert(activitiesTable)
      .values({
        daily_itinerary_id: itineraryResult[0].id,
        title: 'Test Activity',
        location_name: 'Test Location',
        order_index: 1
      })
      .returning()
      .execute();
    testActivityId = activityResult[0].id;
  });

  const testInput: CreateReminderInput = {
    user_id: 0, // Will be set in tests
    trip_id: 0, // Will be set in tests
    activity_id: null,
    title: 'Test Reminder',
    message: 'Don\'t forget to pack your sunscreen!',
    reminder_time: new Date('2023-12-31T10:00:00Z')
  };

  it('should create a reminder without activity', async () => {
    const input = {
      ...testInput,
      user_id: testUserId,
      trip_id: testTripId,
      activity_id: null
    };

    const result = await createReminder(input);

    expect(result.user_id).toEqual(testUserId);
    expect(result.trip_id).toEqual(testTripId);
    expect(result.activity_id).toBeNull();
    expect(result.title).toEqual('Test Reminder');
    expect(result.message).toEqual('Don\'t forget to pack your sunscreen!');
    expect(result.reminder_time).toEqual(new Date('2023-12-31T10:00:00Z'));
    expect(result.is_sent).toBe(false);
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
  });

  it('should create a reminder with activity', async () => {
    const input = {
      ...testInput,
      user_id: testUserId,
      trip_id: testTripId,
      activity_id: testActivityId,
      title: 'Activity Reminder',
      message: 'Your tour starts in 30 minutes!'
    };

    const result = await createReminder(input);

    expect(result.user_id).toEqual(testUserId);
    expect(result.trip_id).toEqual(testTripId);
    expect(result.activity_id).toEqual(testActivityId);
    expect(result.title).toEqual('Activity Reminder');
    expect(result.message).toEqual('Your tour starts in 30 minutes!');
    expect(result.is_sent).toBe(false);
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
  });

  it('should save reminder to database', async () => {
    const input = {
      ...testInput,
      user_id: testUserId,
      trip_id: testTripId
    };

    const result = await createReminder(input);

    const reminders = await db.select()
      .from(remindersTable)
      .where(eq(remindersTable.id, result.id))
      .execute();

    expect(reminders).toHaveLength(1);
    expect(reminders[0].user_id).toEqual(testUserId);
    expect(reminders[0].trip_id).toEqual(testTripId);
    expect(reminders[0].title).toEqual('Test Reminder');
    expect(reminders[0].message).toEqual('Don\'t forget to pack your sunscreen!');
    expect(reminders[0].reminder_time).toEqual(new Date('2023-12-31T10:00:00Z'));
    expect(reminders[0].is_sent).toBe(false);
    expect(reminders[0].created_at).toBeInstanceOf(Date);
  });

  it('should handle future reminder times', async () => {
    const futureTime = new Date();
    futureTime.setDate(futureTime.getDate() + 7);

    const input = {
      ...testInput,
      user_id: testUserId,
      trip_id: testTripId,
      reminder_time: futureTime
    };

    const result = await createReminder(input);

    expect(result.reminder_time).toEqual(futureTime);
    expect(result.is_sent).toBe(false);
  });

  it('should throw error for non-existent user', async () => {
    const input = {
      ...testInput,
      user_id: 99999,
      trip_id: testTripId
    };

    await expect(createReminder(input)).rejects.toThrow(/violates foreign key constraint/i);
  });

  it('should throw error for non-existent trip', async () => {
    const input = {
      ...testInput,
      user_id: testUserId,
      trip_id: 99999
    };

    await expect(createReminder(input)).rejects.toThrow(/violates foreign key constraint/i);
  });

  it('should throw error for non-existent activity', async () => {
    const input = {
      ...testInput,
      user_id: testUserId,
      trip_id: testTripId,
      activity_id: 99999
    };

    await expect(createReminder(input)).rejects.toThrow(/violates foreign key constraint/i);
  });
});
