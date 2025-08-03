
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, tripsTable, remindersTable } from '../db/schema';
import { getUserReminders } from '../handlers/get_user_reminders';

describe('getUserReminders', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return all reminders for a user ordered by reminder_time', async () => {
    // Create test user
    const [user] = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        username: 'testuser',
        password_hash: 'hashedpassword',
        first_name: 'Test',
        last_name: 'User'
      })
      .returning()
      .execute();

    // Create test trip
    const [trip] = await db.insert(tripsTable)
      .values({
        user_id: user.id,
        title: 'Test Trip',
        destination: 'Test Destination',
        start_date: new Date('2024-01-01'),
        end_date: new Date('2024-01-05'),
        is_public: false
      })
      .returning()
      .execute();

    // Create reminders with different reminder times
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);

    const [reminder1] = await db.insert(remindersTable)
      .values({
        user_id: user.id,
        trip_id: trip.id,
        activity_id: null,
        title: 'Later Reminder',
        message: 'This reminder is for next week',
        reminder_time: nextWeek,
        is_sent: false
      })
      .returning()
      .execute();

    const [reminder2] = await db.insert(remindersTable)
      .values({
        user_id: user.id,
        trip_id: trip.id,
        activity_id: null,
        title: 'Earlier Reminder',
        message: 'This reminder is for tomorrow',
        reminder_time: tomorrow,
        is_sent: false
      })
      .returning()
      .execute();

    const results = await getUserReminders(user.id);

    expect(results).toHaveLength(2);
    
    // Should be ordered by reminder_time (earliest first)
    expect(results[0].id).toBe(reminder2.id);
    expect(results[0].title).toBe('Earlier Reminder');
    expect(results[0].reminder_time).toEqual(tomorrow);
    
    expect(results[1].id).toBe(reminder1.id);
    expect(results[1].title).toBe('Later Reminder');
    expect(results[1].reminder_time).toEqual(nextWeek);

    // Verify all fields are present
    expect(results[0].user_id).toBe(user.id);
    expect(results[0].trip_id).toBe(trip.id);
    expect(results[0].activity_id).toBeNull();
    expect(results[0].message).toBe('This reminder is for tomorrow');
    expect(results[0].is_sent).toBe(false);
    expect(results[0].created_at).toBeInstanceOf(Date);
  });

  it('should return empty array when user has no reminders', async () => {
    // Create test user
    const [user] = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        username: 'testuser',
        password_hash: 'hashedpassword',
        first_name: 'Test',
        last_name: 'User'
      })
      .returning()
      .execute();

    const results = await getUserReminders(user.id);

    expect(results).toHaveLength(0);
  });

  it('should return only reminders for the specified user', async () => {
    // Create two test users
    const [user1] = await db.insert(usersTable)
      .values({
        email: 'user1@example.com',
        username: 'user1',
        password_hash: 'hashedpassword',
        first_name: 'User',
        last_name: 'One'
      })
      .returning()
      .execute();

    const [user2] = await db.insert(usersTable)
      .values({
        email: 'user2@example.com',
        username: 'user2',
        password_hash: 'hashedpassword',
        first_name: 'User',
        last_name: 'Two'
      })
      .returning()
      .execute();

    // Create trips for both users
    const [trip1] = await db.insert(tripsTable)
      .values({
        user_id: user1.id,
        title: 'User 1 Trip',
        destination: 'Destination 1',
        start_date: new Date('2024-01-01'),
        end_date: new Date('2024-01-05'),
        is_public: false
      })
      .returning()
      .execute();

    const [trip2] = await db.insert(tripsTable)
      .values({
        user_id: user2.id,
        title: 'User 2 Trip',
        destination: 'Destination 2',
        start_date: new Date('2024-02-01'),
        end_date: new Date('2024-02-05'),
        is_public: false
      })
      .returning()
      .execute();

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Create reminders for both users
    await db.insert(remindersTable)
      .values({
        user_id: user1.id,
        trip_id: trip1.id,
        activity_id: null,
        title: 'User 1 Reminder',
        message: 'Message for user 1',
        reminder_time: tomorrow,
        is_sent: false
      })
      .execute();

    await db.insert(remindersTable)
      .values({
        user_id: user2.id,
        trip_id: trip2.id,
        activity_id: null,
        title: 'User 2 Reminder',
        message: 'Message for user 2',
        reminder_time: tomorrow,
        is_sent: false
      })
      .execute();

    const results = await getUserReminders(user1.id);

    expect(results).toHaveLength(1);
    expect(results[0].user_id).toBe(user1.id);
    expect(results[0].title).toBe('User 1 Reminder');
    expect(results[0].message).toBe('Message for user 1');
  });

  it('should include both sent and unsent reminders', async () => {
    // Create test user
    const [user] = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        username: 'testuser',
        password_hash: 'hashedpassword',
        first_name: 'Test',
        last_name: 'User'
      })
      .returning()
      .execute();

    // Create test trip
    const [trip] = await db.insert(tripsTable)
      .values({
        user_id: user.id,
        title: 'Test Trip',
        destination: 'Test Destination',
        start_date: new Date('2024-01-01'),
        end_date: new Date('2024-01-05'),
        is_public: false
      })
      .returning()
      .execute();

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Create both sent and unsent reminders
    await db.insert(remindersTable)
      .values([
        {
          user_id: user.id,
          trip_id: trip.id,
          activity_id: null,
          title: 'Sent Reminder',
          message: 'This reminder was sent',
          reminder_time: tomorrow,
          is_sent: true
        },
        {
          user_id: user.id,
          trip_id: trip.id,
          activity_id: null,
          title: 'Unsent Reminder',
          message: 'This reminder is pending',
          reminder_time: tomorrow,
          is_sent: false
        }
      ])
      .execute();

    const results = await getUserReminders(user.id);

    expect(results).toHaveLength(2);
    
    const sentReminder = results.find(r => r.title === 'Sent Reminder');
    const unsentReminder = results.find(r => r.title === 'Unsent Reminder');
    
    expect(sentReminder?.is_sent).toBe(true);
    expect(unsentReminder?.is_sent).toBe(false);
  });
});
