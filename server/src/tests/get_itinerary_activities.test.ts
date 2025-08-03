
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, tripsTable, dailyItinerariesTable, activitiesTable } from '../db/schema';
import { getItineraryActivities } from '../handlers/get_itinerary_activities';
import { type CreateUserInput, type CreateTripInput, type CreateDailyItineraryInput, type CreateActivityInput } from '../schema';

const testUser: CreateUserInput = {
  email: 'test@example.com',
  username: 'testuser',
  password: 'password123',
  first_name: 'Test',
  last_name: 'User'
};

const testTrip: CreateTripInput = {
  user_id: 0, // Will be set after user creation
  title: 'Test Trip',
  description: 'A test trip',
  destination: 'Test City',
  start_date: new Date('2024-01-01'),
  end_date: new Date('2024-01-05'),
  is_public: false
};

const testItinerary: CreateDailyItineraryInput = {
  trip_id: 0, // Will be set after trip creation
  date: new Date('2024-01-01'),
  title: 'Day 1',
  notes: 'First day of the trip'
};

const testActivity1: CreateActivityInput = {
  daily_itinerary_id: 0, // Will be set after itinerary creation
  title: 'Visit Museum',
  description: 'Explore the local museum',
  location_name: 'City Museum',
  latitude: 40.7128,
  longitude: -74.0060,
  start_time: '09:00',
  end_time: '11:00',
  estimated_duration: 120,
  transportation_method: 'walking',
  cost_estimate: 15.50,
  order_index: 1
};

const testActivity2: CreateActivityInput = {
  daily_itinerary_id: 0,
  title: 'Lunch at Cafe',
  description: 'Nice lunch spot',
  location_name: 'Downtown Cafe',
  latitude: 40.7589,
  longitude: -73.9851,
  start_time: '12:00',
  end_time: '13:30',
  estimated_duration: 90,
  transportation_method: 'walking',
  cost_estimate: 25.00,
  order_index: 2
};

const testActivity3: CreateActivityInput = {
  daily_itinerary_id: 0,
  title: 'Park Walk',
  description: null,
  location_name: 'Central Park',
  latitude: null,
  longitude: null,
  start_time: null,
  end_time: null,
  estimated_duration: null,
  transportation_method: null,
  cost_estimate: null,
  order_index: 0 // Should be first when ordered
};

describe('getItineraryActivities', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return activities ordered by order_index', async () => {
    // Create user
    const userResult = await db.insert(usersTable)
      .values({
        email: testUser.email,
        username: testUser.username,
        password_hash: 'hashed_password',
        first_name: testUser.first_name,
        last_name: testUser.last_name
      })
      .returning()
      .execute();

    // Create trip
    const tripResult = await db.insert(tripsTable)
      .values({
        ...testTrip,
        user_id: userResult[0].id
      })
      .returning()
      .execute();

    // Create daily itinerary
    const itineraryResult = await db.insert(dailyItinerariesTable)
      .values({
        ...testItinerary,
        trip_id: tripResult[0].id
      })
      .returning()
      .execute();

    const itineraryId = itineraryResult[0].id;

    // Create activities in random insertion order
    await db.insert(activitiesTable)
      .values([
        {
          ...testActivity2, // order_index: 2
          daily_itinerary_id: itineraryId,
          cost_estimate: testActivity2.cost_estimate?.toString()
        },
        {
          ...testActivity1, // order_index: 1
          daily_itinerary_id: itineraryId,
          cost_estimate: testActivity1.cost_estimate?.toString()
        },
        {
          ...testActivity3, // order_index: 0
          daily_itinerary_id: itineraryId,
          cost_estimate: null
        }
      ])
      .execute();

    const activities = await getItineraryActivities(itineraryId);

    expect(activities).toHaveLength(3);
    
    // Should be ordered by order_index (0, 1, 2)
    expect(activities[0].order_index).toBe(0);
    expect(activities[0].title).toBe('Park Walk');
    expect(activities[1].order_index).toBe(1);
    expect(activities[1].title).toBe('Visit Museum');
    expect(activities[2].order_index).toBe(2);
    expect(activities[2].title).toBe('Lunch at Cafe');
  });

  it('should convert numeric cost_estimate to number', async () => {
    // Create prerequisite data
    const userResult = await db.insert(usersTable)
      .values({
        email: testUser.email,
        username: testUser.username,
        password_hash: 'hashed_password',
        first_name: testUser.first_name,
        last_name: testUser.last_name
      })
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
        ...testItinerary,
        trip_id: tripResult[0].id
      })
      .returning()
      .execute();

    const itineraryId = itineraryResult[0].id;

    // Create activity with cost estimate
    await db.insert(activitiesTable)
      .values({
        ...testActivity1,
        daily_itinerary_id: itineraryId,
        cost_estimate: testActivity1.cost_estimate?.toString()
      })
      .execute();

    const activities = await getItineraryActivities(itineraryId);

    expect(activities).toHaveLength(1);
    expect(typeof activities[0].cost_estimate).toBe('number');
    expect(activities[0].cost_estimate).toBe(15.50);
  });

  it('should handle null cost_estimate correctly', async () => {
    // Create prerequisite data
    const userResult = await db.insert(usersTable)
      .values({
        email: testUser.email,
        username: testUser.username,
        password_hash: 'hashed_password',
        first_name: testUser.first_name,
        last_name: testUser.last_name
      })
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
        ...testItinerary,
        trip_id: tripResult[0].id
      })
      .returning()
      .execute();

    const itineraryId = itineraryResult[0].id;

    // Create activity with null cost estimate
    await db.insert(activitiesTable)
      .values({
        ...testActivity3,
        daily_itinerary_id: itineraryId,
        cost_estimate: null
      })
      .execute();

    const activities = await getItineraryActivities(itineraryId);

    expect(activities).toHaveLength(1);
    expect(activities[0].cost_estimate).toBeNull();
  });

  it('should return empty array for non-existent itinerary', async () => {
    const activities = await getItineraryActivities(999);
    expect(activities).toHaveLength(0);
  });

  it('should include all activity fields', async () => {
    // Create prerequisite data
    const userResult = await db.insert(usersTable)
      .values({
        email: testUser.email,
        username: testUser.username,
        password_hash: 'hashed_password',
        first_name: testUser.first_name,
        last_name: testUser.last_name
      })
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
        ...testItinerary,
        trip_id: tripResult[0].id
      })
      .returning()
      .execute();

    const itineraryId = itineraryResult[0].id;

    // Create activity with all fields
    await db.insert(activitiesTable)
      .values({
        ...testActivity1,
        daily_itinerary_id: itineraryId,
        cost_estimate: testActivity1.cost_estimate?.toString()
      })
      .execute();

    const activities = await getItineraryActivities(itineraryId);

    expect(activities).toHaveLength(1);
    const activity = activities[0];

    expect(activity.id).toBeDefined();
    expect(activity.daily_itinerary_id).toBe(itineraryId);
    expect(activity.title).toBe('Visit Museum');
    expect(activity.description).toBe('Explore the local museum');
    expect(activity.location_name).toBe('City Museum');
    expect(activity.latitude).toBe(40.7128);
    expect(activity.longitude).toBe(-74.0060);
    expect(activity.start_time).toBe('09:00');
    expect(activity.end_time).toBe('11:00');
    expect(activity.estimated_duration).toBe(120);
    expect(activity.transportation_method).toBe('walking');
    expect(activity.cost_estimate).toBe(15.50);
    expect(activity.order_index).toBe(1);
    expect(activity.created_at).toBeInstanceOf(Date);
    expect(activity.updated_at).toBeInstanceOf(Date);
  });
});
