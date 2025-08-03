
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, tripsTable, dailyItinerariesTable } from '../db/schema';
import { getTripItineraries } from '../handlers/get_trip_itineraries';

describe('getTripItineraries', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return itineraries for a trip ordered by date', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        username: 'testuser',
        password_hash: 'hashedpassword'
      })
      .returning()
      .execute();

    const userId = userResult[0].id;

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

    const tripId = tripResult[0].id;

    // Create multiple daily itineraries with different dates
    const itinerary1 = await db.insert(dailyItinerariesTable)
      .values({
        trip_id: tripId,
        date: new Date('2024-01-03'),
        title: 'Day 3 Activities',
        notes: 'Third day notes'
      })
      .returning()
      .execute();

    const itinerary2 = await db.insert(dailyItinerariesTable)
      .values({
        trip_id: tripId,
        date: new Date('2024-01-01'),
        title: 'Day 1 Activities',
        notes: 'First day notes'
      })
      .returning()
      .execute();

    const itinerary3 = await db.insert(dailyItinerariesTable)
      .values({
        trip_id: tripId,
        date: new Date('2024-01-02'),
        title: 'Day 2 Activities',
        notes: null
      })
      .returning()
      .execute();

    const result = await getTripItineraries(tripId);

    // Should return all 3 itineraries
    expect(result).toHaveLength(3);

    // Should be ordered by date (ascending)
    expect(result[0].title).toEqual('Day 1 Activities');
    expect(result[1].title).toEqual('Day 2 Activities');
    expect(result[2].title).toEqual('Day 3 Activities');

    // Verify date ordering
    expect(result[0].date).toEqual(new Date('2024-01-01'));
    expect(result[1].date).toEqual(new Date('2024-01-02'));
    expect(result[2].date).toEqual(new Date('2024-01-03'));

    // Verify all fields are present
    expect(result[0].id).toBeDefined();
    expect(result[0].trip_id).toEqual(tripId);
    expect(result[0].notes).toEqual('First day notes');
    expect(result[0].created_at).toBeInstanceOf(Date);
    expect(result[0].updated_at).toBeInstanceOf(Date);

    expect(result[1].notes).toBeNull();
  });

  it('should return empty array for trip with no itineraries', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        username: 'testuser',
        password_hash: 'hashedpassword'
      })
      .returning()
      .execute();

    const userId = userResult[0].id;

    // Create test trip
    const tripResult = await db.insert(tripsTable)
      .values({
        user_id: userId,
        title: 'Empty Trip',
        destination: 'Test Destination',
        start_date: new Date('2024-01-01'),
        end_date: new Date('2024-01-05'),
        is_public: false
      })
      .returning()
      .execute();

    const tripId = tripResult[0].id;

    const result = await getTripItineraries(tripId);

    expect(result).toHaveLength(0);
    expect(Array.isArray(result)).toBe(true);
  });

  it('should only return itineraries for the specified trip', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        username: 'testuser',
        password_hash: 'hashedpassword'
      })
      .returning()
      .execute();

    const userId = userResult[0].id;

    // Create two test trips
    const trip1Result = await db.insert(tripsTable)
      .values({
        user_id: userId,
        title: 'Trip 1',
        destination: 'Destination 1',
        start_date: new Date('2024-01-01'),
        end_date: new Date('2024-01-05'),
        is_public: false
      })
      .returning()
      .execute();

    const trip2Result = await db.insert(tripsTable)
      .values({
        user_id: userId,
        title: 'Trip 2',
        destination: 'Destination 2',
        start_date: new Date('2024-02-01'),
        end_date: new Date('2024-02-05'),
        is_public: false
      })
      .returning()
      .execute();

    const trip1Id = trip1Result[0].id;
    const trip2Id = trip2Result[0].id;

    // Create itinerary for trip 1
    await db.insert(dailyItinerariesTable)
      .values({
        trip_id: trip1Id,
        date: new Date('2024-01-01'),
        title: 'Trip 1 Day 1',
        notes: 'Trip 1 notes'
      })
      .execute();

    // Create itinerary for trip 2
    await db.insert(dailyItinerariesTable)
      .values({
        trip_id: trip2Id,
        date: new Date('2024-02-01'),
        title: 'Trip 2 Day 1',
        notes: 'Trip 2 notes'
      })
      .execute();

    const result = await getTripItineraries(trip1Id);

    expect(result).toHaveLength(1);
    expect(result[0].title).toEqual('Trip 1 Day 1');
    expect(result[0].trip_id).toEqual(trip1Id);
    expect(result[0].notes).toEqual('Trip 1 notes');
  });
});
