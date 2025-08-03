
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, tripsTable, dailyItinerariesTable, activitiesTable } from '../db/schema';
import { updateActivityOrder } from '../handlers/update_activity_order';
import { eq, asc } from 'drizzle-orm';

describe('updateActivityOrder', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  let userId: number;
  let tripId: number;
  let dailyItineraryId: number;
  let activityIds: number[];

  beforeEach(async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        username: 'testuser',
        password_hash: 'hashedpassword'
      })
      .returning()
      .execute();
    
    userId = userResult[0].id;

    // Create test trip
    const tripResult = await db.insert(tripsTable)
      .values({
        user_id: userId,
        title: 'Test Trip',
        destination: 'Test Destination',
        start_date: new Date('2024-01-01'),
        end_date: new Date('2024-01-05'),
        is_public: false
      })
      .returning()
      .execute();
    
    tripId = tripResult[0].id;

    // Create daily itinerary
    const itineraryResult = await db.insert(dailyItinerariesTable)
      .values({
        trip_id: tripId,
        date: new Date('2024-01-01'),
        title: 'Day 1'
      })
      .returning()
      .execute();
    
    dailyItineraryId = itineraryResult[0].id;

    // Create multiple activities with different order indices
    const activitiesData = [
      { title: 'Activity 1', order_index: 0 },
      { title: 'Activity 2', order_index: 1 },
      { title: 'Activity 3', order_index: 2 },
      { title: 'Activity 4', order_index: 3 },
      { title: 'Activity 5', order_index: 4 }
    ];

    activityIds = [];
    for (const activityData of activitiesData) {
      const result = await db.insert(activitiesTable)
        .values({
          daily_itinerary_id: dailyItineraryId,
          title: activityData.title,
          location_name: 'Test Location',
          order_index: activityData.order_index
        })
        .returning()
        .execute();
      
      activityIds.push(result[0].id);
    }
  });

  it('should successfully update activity order', async () => {
    const result = await updateActivityOrder(activityIds[0], 2);
    expect(result.success).toBe(true);
  });

  it('should move activity down and shift others up', async () => {
    // Move first activity (index 0) to position 2
    await updateActivityOrder(activityIds[0], 2);

    // Check the activities are in correct order
    const activities = await db.select()
      .from(activitiesTable)
      .where(eq(activitiesTable.daily_itinerary_id, dailyItineraryId))
      .orderBy(asc(activitiesTable.order_index))
      .execute();

    // Expected order: Activity 2 (0), Activity 3 (1), Activity 1 (2), Activity 4 (3), Activity 5 (4)
    expect(activities[0].title).toBe('Activity 2');
    expect(activities[0].order_index).toBe(0);
    expect(activities[1].title).toBe('Activity 3');
    expect(activities[1].order_index).toBe(1);
    expect(activities[2].title).toBe('Activity 1');
    expect(activities[2].order_index).toBe(2);
    expect(activities[3].title).toBe('Activity 4');
    expect(activities[3].order_index).toBe(3);
    expect(activities[4].title).toBe('Activity 5');
    expect(activities[4].order_index).toBe(4);
  });

  it('should move activity up and shift others down', async () => {
    // Move fourth activity (index 3) to position 1
    await updateActivityOrder(activityIds[3], 1);

    // Check the activities are in correct order
    const activities = await db.select()
      .from(activitiesTable)
      .where(eq(activitiesTable.daily_itinerary_id, dailyItineraryId))
      .orderBy(asc(activitiesTable.order_index))
      .execute();

    // Expected order: Activity 1 (0), Activity 4 (1), Activity 2 (2), Activity 3 (3), Activity 5 (4)
    expect(activities[0].title).toBe('Activity 1');
    expect(activities[0].order_index).toBe(0);
    expect(activities[1].title).toBe('Activity 4');
    expect(activities[1].order_index).toBe(1);
    expect(activities[2].title).toBe('Activity 2');
    expect(activities[2].order_index).toBe(2);
    expect(activities[3].title).toBe('Activity 3');
    expect(activities[3].order_index).toBe(3);
    expect(activities[4].title).toBe('Activity 5');
    expect(activities[4].order_index).toBe(4);
  });

  it('should handle same position without changes', async () => {
    // Move activity to its current position
    await updateActivityOrder(activityIds[2], 2);

    // Check that no activities changed their order
    const activities = await db.select()
      .from(activitiesTable)
      .where(eq(activitiesTable.daily_itinerary_id, dailyItineraryId))
      .orderBy(asc(activitiesTable.order_index))
      .execute();

    expect(activities[0].title).toBe('Activity 1');
    expect(activities[0].order_index).toBe(0);
    expect(activities[1].title).toBe('Activity 2');
    expect(activities[1].order_index).toBe(1);
    expect(activities[2].title).toBe('Activity 3');
    expect(activities[2].order_index).toBe(2);
    expect(activities[3].title).toBe('Activity 4');
    expect(activities[3].order_index).toBe(3);
    expect(activities[4].title).toBe('Activity 5');
    expect(activities[4].order_index).toBe(4);
  });

  it('should move activity to last position', async () => {
    // Move first activity to last position
    await updateActivityOrder(activityIds[0], 4);

    const activities = await db.select()
      .from(activitiesTable)
      .where(eq(activitiesTable.daily_itinerary_id, dailyItineraryId))
      .orderBy(asc(activitiesTable.order_index))
      .execute();

    // Expected: Activity 2, 3, 4, 5, 1
    expect(activities[0].title).toBe('Activity 2');
    expect(activities[4].title).toBe('Activity 1');
    expect(activities[4].order_index).toBe(4);
  });

  it('should move activity to first position', async () => {
    // Move last activity to first position
    await updateActivityOrder(activityIds[4], 0);

    const activities = await db.select()
      .from(activitiesTable)
      .where(eq(activitiesTable.daily_itinerary_id, dailyItineraryId))
      .orderBy(asc(activitiesTable.order_index))
      .execute();

    // Expected: Activity 5, 1, 2, 3, 4
    expect(activities[0].title).toBe('Activity 5');
    expect(activities[0].order_index).toBe(0);
    expect(activities[1].title).toBe('Activity 1');
    expect(activities[1].order_index).toBe(1);
  });

  it('should throw error for non-existent activity', async () => {
    await expect(updateActivityOrder(99999, 1)).rejects.toThrow(/activity not found/i);
  });

  it('should update updated_at timestamp', async () => {
    const beforeUpdate = new Date();
    await updateActivityOrder(activityIds[0], 2);

    const updatedActivity = await db.select()
      .from(activitiesTable)
      .where(eq(activitiesTable.id, activityIds[0]))
      .execute();

    expect(updatedActivity[0].updated_at >= beforeUpdate).toBe(true);
  });
});
