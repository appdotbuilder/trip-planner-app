
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { activitiesTable, usersTable, tripsTable, dailyItinerariesTable } from '../db/schema';
import { type CreateActivityInput } from '../schema';
import { createActivity } from '../handlers/create_activity';
import { eq } from 'drizzle-orm';

// Test data setup
const testUser = {
  email: 'test@example.com',
  username: 'testuser',
  password_hash: 'hashedpassword',
  first_name: 'Test',
  last_name: 'User'
};

const testTrip = {
  title: 'Test Trip',
  description: 'A trip for testing',
  destination: 'Test City',
  start_date: new Date('2024-01-01'),
  end_date: new Date('2024-01-05'),
  is_public: false
};

const testDailyItinerary = {
  date: new Date('2024-01-02'),
  title: 'Day 2 Activities',
  notes: 'Exploring the city'
};

const testInput: CreateActivityInput = {
  daily_itinerary_id: 1, // Will be set after creating prerequisites
  title: 'Visit Museum',
  description: 'Explore the local history museum',
  location_name: 'City History Museum',
  latitude: 40.7128,
  longitude: -74.0060,
  start_time: '10:00',
  end_time: '12:00',
  estimated_duration: 120,
  transportation_method: 'walking',
  cost_estimate: 15.50,
  order_index: 1
};

describe('createActivity', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create an activity with all fields', async () => {
    // Create prerequisite data
    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();
    
    const tripResult = await db.insert(tripsTable)
      .values({
        ...testTrip,
        user_id: userResult[0].id
      })
      .returning()
      .execute();

    const itineraryResult = await db.insert(dailyItinerariesTable)
      .values({
        ...testDailyItinerary,
        trip_id: tripResult[0].id
      })
      .returning()
      .execute();

    // Update test input with actual daily_itinerary_id
    const input = {
      ...testInput,
      daily_itinerary_id: itineraryResult[0].id
    };

    const result = await createActivity(input);

    // Basic field validation
    expect(result.title).toEqual('Visit Museum');
    expect(result.description).toEqual('Explore the local history museum');
    expect(result.location_name).toEqual('City History Museum');
    expect(result.latitude).toEqual(40.7128);
    expect(result.longitude).toEqual(-74.0060);
    expect(result.start_time).toEqual('10:00');
    expect(result.end_time).toEqual('12:00');
    expect(result.estimated_duration).toEqual(120);
    expect(result.transportation_method).toEqual('walking');
    expect(result.cost_estimate).toEqual(15.50);
    expect(typeof result.cost_estimate).toBe('number');
    expect(result.order_index).toEqual(1);
    expect(result.daily_itinerary_id).toEqual(itineraryResult[0].id);
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should create an activity with minimal fields', async () => {
    // Create prerequisite data
    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();
    
    const tripResult = await db.insert(tripsTable)
      .values({
        ...testTrip,
        user_id: userResult[0].id
      })
      .returning()
      .execute();

    const itineraryResult = await db.insert(dailyItinerariesTable)
      .values({
        ...testDailyItinerary,
        trip_id: tripResult[0].id
      })
      .returning()
      .execute();

    // Minimal input with only required fields
    const minimalInput: CreateActivityInput = {
      daily_itinerary_id: itineraryResult[0].id,
      title: 'Simple Activity',
      description: null,
      location_name: 'Some Location',
      latitude: null,
      longitude: null,
      start_time: null,
      end_time: null,
      estimated_duration: null,
      transportation_method: null,
      cost_estimate: null,
      order_index: 0
    };

    const result = await createActivity(minimalInput);

    expect(result.title).toEqual('Simple Activity');
    expect(result.description).toBeNull();
    expect(result.location_name).toEqual('Some Location');
    expect(result.latitude).toBeNull();
    expect(result.longitude).toBeNull();
    expect(result.start_time).toBeNull();
    expect(result.end_time).toBeNull();
    expect(result.estimated_duration).toBeNull();
    expect(result.transportation_method).toBeNull();
    expect(result.cost_estimate).toBeNull();
    expect(result.order_index).toEqual(0);
    expect(result.id).toBeDefined();
  });

  it('should save activity to database', async () => {
    // Create prerequisite data
    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();
    
    const tripResult = await db.insert(tripsTable)
      .values({
        ...testTrip,
        user_id: userResult[0].id
      })
      .returning()
      .execute();

    const itineraryResult = await db.insert(dailyItinerariesTable)
      .values({
        ...testDailyItinerary,
        trip_id: tripResult[0].id
      })
      .returning()
      .execute();

    const input = {
      ...testInput,
      daily_itinerary_id: itineraryResult[0].id
    };

    const result = await createActivity(input);

    // Query using proper drizzle syntax
    const activities = await db.select()
      .from(activitiesTable)
      .where(eq(activitiesTable.id, result.id))
      .execute();

    expect(activities).toHaveLength(1);
    expect(activities[0].title).toEqual('Visit Museum');
    expect(activities[0].location_name).toEqual('City History Museum');
    expect(activities[0].daily_itinerary_id).toEqual(itineraryResult[0].id);
    expect(parseFloat(activities[0].cost_estimate!)).toEqual(15.50);
    expect(activities[0].created_at).toBeInstanceOf(Date);
    expect(activities[0].updated_at).toBeInstanceOf(Date);
  });

  it('should handle numeric cost_estimate conversion correctly', async () => {
    // Create prerequisite data
    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();
    
    const tripResult = await db.insert(tripsTable)
      .values({
        ...testTrip,
        user_id: userResult[0].id
      })
      .returning()
      .execute();

    const itineraryResult = await db.insert(dailyItinerariesTable)
      .values({
        ...testDailyItinerary,
        trip_id: tripResult[0].id
      })
      .returning()
      .execute();

    const input = {
      ...testInput,
      daily_itinerary_id: itineraryResult[0].id,
      cost_estimate: 99.99
    };

    const result = await createActivity(input);

    // Verify numeric conversion
    expect(typeof result.cost_estimate).toBe('number');
    expect(result.cost_estimate).toEqual(99.99);

    // Verify database storage
    const activities = await db.select()
      .from(activitiesTable)
      .where(eq(activitiesTable.id, result.id))
      .execute();

    expect(parseFloat(activities[0].cost_estimate!)).toEqual(99.99);
  });
});
