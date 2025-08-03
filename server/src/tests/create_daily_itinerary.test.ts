
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, tripsTable, dailyItinerariesTable } from '../db/schema';
import { type CreateDailyItineraryInput } from '../schema';
import { createDailyItinerary } from '../handlers/create_daily_itinerary';
import { eq } from 'drizzle-orm';

describe('createDailyItinerary', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create a daily itinerary', async () => {
    // Create prerequisite user
    const userResult = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        username: 'testuser',
        password_hash: 'hashedpassword'
      })
      .returning()
      .execute();

    const user = userResult[0];

    // Create prerequisite trip
    const tripResult = await db.insert(tripsTable)
      .values({
        user_id: user.id,
        title: 'Test Trip',
        destination: 'Test Destination',
        start_date: new Date('2024-01-01'),
        end_date: new Date('2024-01-07'),
        is_public: false
      })
      .returning()
      .execute();

    const trip = tripResult[0];

    // Test input
    const testInput: CreateDailyItineraryInput = {
      trip_id: trip.id,
      date: new Date('2024-01-02'),
      title: 'Day 2 Itinerary',
      notes: 'Exploring the city center'
    };

    const result = await createDailyItinerary(testInput);

    // Basic field validation
    expect(result.trip_id).toEqual(trip.id);
    expect(result.date).toEqual(new Date('2024-01-02'));
    expect(result.title).toEqual('Day 2 Itinerary');
    expect(result.notes).toEqual('Exploring the city center');
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should save daily itinerary to database', async () => {
    // Create prerequisite user
    const userResult = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        username: 'testuser',
        password_hash: 'hashedpassword'
      })
      .returning()
      .execute();

    const user = userResult[0];

    // Create prerequisite trip
    const tripResult = await db.insert(tripsTable)
      .values({
        user_id: user.id,
        title: 'Test Trip',
        destination: 'Test Destination',
        start_date: new Date('2024-01-01'),
        end_date: new Date('2024-01-07'),
        is_public: false
      })
      .returning()
      .execute();

    const trip = tripResult[0];

    // Test input
    const testInput: CreateDailyItineraryInput = {
      trip_id: trip.id,
      date: new Date('2024-01-02'),
      title: 'Day 2 Itinerary',
      notes: 'Exploring the city center'
    };

    const result = await createDailyItinerary(testInput);

    // Query using proper drizzle syntax
    const dailyItineraries = await db.select()
      .from(dailyItinerariesTable)
      .where(eq(dailyItinerariesTable.id, result.id))
      .execute();

    expect(dailyItineraries).toHaveLength(1);
    expect(dailyItineraries[0].trip_id).toEqual(trip.id);
    expect(dailyItineraries[0].date).toEqual(new Date('2024-01-02'));
    expect(dailyItineraries[0].title).toEqual('Day 2 Itinerary');
    expect(dailyItineraries[0].notes).toEqual('Exploring the city center');
    expect(dailyItineraries[0].created_at).toBeInstanceOf(Date);
    expect(dailyItineraries[0].updated_at).toBeInstanceOf(Date);
  });

  it('should create daily itinerary with null notes', async () => {
    // Create prerequisite user
    const userResult = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        username: 'testuser',
        password_hash: 'hashedpassword'
      })
      .returning()
      .execute();

    const user = userResult[0];

    // Create prerequisite trip
    const tripResult = await db.insert(tripsTable)
      .values({
        user_id: user.id,
        title: 'Test Trip',
        destination: 'Test Destination',
        start_date: new Date('2024-01-01'),
        end_date: new Date('2024-01-07'),
        is_public: false
      })
      .returning()
      .execute();

    const trip = tripResult[0];

    // Test input with null notes
    const testInput: CreateDailyItineraryInput = {
      trip_id: trip.id,
      date: new Date('2024-01-03'),
      title: 'Day 3 Itinerary',
      notes: null
    };

    const result = await createDailyItinerary(testInput);

    expect(result.notes).toBeNull();
    expect(result.title).toEqual('Day 3 Itinerary');
    expect(result.trip_id).toEqual(trip.id);
  });

  it('should throw error for non-existent trip', async () => {
    const testInput: CreateDailyItineraryInput = {
      trip_id: 99999, // Non-existent trip ID
      date: new Date('2024-01-02'),
      title: 'Day 2 Itinerary',
      notes: 'This should fail'
    };

    await expect(createDailyItinerary(testInput)).rejects.toThrow(/violates foreign key constraint/i);
  });
});
