
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, tripsTable, tripMembersTable } from '../db/schema';
import { type CreateUserInput, type CreateTripInput } from '../schema';
import { getTripDetails } from '../handlers/get_trip_details';

// Test data
const testUser1: CreateUserInput = {
  email: 'owner@test.com',
  username: 'tripowner',
  password: 'password123',
  first_name: 'Trip',
  last_name: 'Owner'
};

const testUser2: CreateUserInput = {
  email: 'member@test.com',
  username: 'tripmember',
  password: 'password123',
  first_name: 'Trip',
  last_name: 'Member'
};

const testUser3: CreateUserInput = {
  email: 'outsider@test.com',
  username: 'outsider',
  password: 'password123',
  first_name: 'Out',
  last_name: 'Sider'
};

describe('getTripDetails', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return trip details for trip owner with edit permissions', async () => {
    // Create user
    const userResult = await db.insert(usersTable)
      .values({
        email: testUser1.email,
        username: testUser1.username,
        password_hash: 'hashed_password',
        first_name: testUser1.first_name,
        last_name: testUser1.last_name
      })
      .returning()
      .execute();

    const user = userResult[0];

    // Create trip
    const tripInput: CreateTripInput = {
      user_id: user.id,
      title: 'Test Trip',
      description: 'A trip for testing',
      destination: 'Test City',
      start_date: new Date('2024-06-01'),
      end_date: new Date('2024-06-07'),
      is_public: false
    };

    const tripResult = await db.insert(tripsTable)
      .values(tripInput)
      .returning()
      .execute();

    const trip = tripResult[0];

    // Get trip details
    const result = await getTripDetails(trip.id, user.id);

    // Verify trip details
    expect(result.id).toEqual(trip.id);
    expect(result.title).toEqual('Test Trip');
    expect(result.description).toEqual('A trip for testing');
    expect(result.destination).toEqual('Test City');
    expect(result.user_id).toEqual(user.id);
    expect(result.is_public).toEqual(false);
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
    expect(result.canEdit).toBe(true);
  });

  it('should return trip details for trip member with owner role with edit permissions', async () => {
    // Create users
    const user1Result = await db.insert(usersTable)
      .values({
        email: testUser1.email,
        username: testUser1.username,
        password_hash: 'hashed_password',
        first_name: testUser1.first_name,
        last_name: testUser1.last_name
      })
      .returning()
      .execute();

    const user2Result = await db.insert(usersTable)
      .values({
        email: testUser2.email,
        username: testUser2.username,
        password_hash: 'hashed_password',
        first_name: testUser2.first_name,
        last_name: testUser2.last_name
      })
      .returning()
      .execute();

    const owner = user1Result[0];
    const member = user2Result[0];

    // Create trip
    const tripResult = await db.insert(tripsTable)
      .values({
        user_id: owner.id,
        title: 'Test Trip',
        description: 'A trip for testing',
        destination: 'Test City',
        start_date: new Date('2024-06-01'),
        end_date: new Date('2024-06-07'),
        is_public: false
      })
      .returning()
      .execute();

    const trip = tripResult[0];

    // Add member with owner role
    await db.insert(tripMembersTable)
      .values({
        trip_id: trip.id,
        user_id: member.id,
        role: 'owner'
      })
      .execute();

    // Get trip details as member
    const result = await getTripDetails(trip.id, member.id);

    expect(result.id).toEqual(trip.id);
    expect(result.title).toEqual('Test Trip');
    expect(result.canEdit).toBe(true);
  });

  it('should return trip details for regular member without edit permissions', async () => {
    // Create users
    const user1Result = await db.insert(usersTable)
      .values({
        email: testUser1.email,
        username: testUser1.username,
        password_hash: 'hashed_password',
        first_name: testUser1.first_name,
        last_name: testUser1.last_name
      })
      .returning()
      .execute();

    const user2Result = await db.insert(usersTable)
      .values({
        email: testUser2.email,
        username: testUser2.username,
        password_hash: 'hashed_password',
        first_name: testUser2.first_name,
        last_name: testUser2.last_name
      })
      .returning()
      .execute();

    const owner = user1Result[0];
    const member = user2Result[0];

    // Create trip
    const tripResult = await db.insert(tripsTable)
      .values({
        user_id: owner.id,
        title: 'Test Trip',
        description: 'A trip for testing',
        destination: 'Test City',
        start_date: new Date('2024-06-01'),
        end_date: new Date('2024-06-07'),
        is_public: false
      })
      .returning()
      .execute();

    const trip = tripResult[0];

    // Add member with regular member role
    await db.insert(tripMembersTable)
      .values({
        trip_id: trip.id,
        user_id: member.id,
        role: 'member'
      })
      .execute();

    // Get trip details as member
    const result = await getTripDetails(trip.id, member.id);

    expect(result.id).toEqual(trip.id);
    expect(result.title).toEqual('Test Trip');
    expect(result.canEdit).toBe(false);
  });

  it('should return trip details for non-member without edit permissions', async () => {
    // Create users
    const user1Result = await db.insert(usersTable)
      .values({
        email: testUser1.email,
        username: testUser1.username,
        password_hash: 'hashed_password',
        first_name: testUser1.first_name,
        last_name: testUser1.last_name
      })
      .returning()
      .execute();

    const user3Result = await db.insert(usersTable)
      .values({
        email: testUser3.email,
        username: testUser3.username,
        password_hash: 'hashed_password',
        first_name: testUser3.first_name,
        last_name: testUser3.last_name
      })
      .returning()
      .execute();

    const owner = user1Result[0];
    const outsider = user3Result[0];

    // Create trip
    const tripResult = await db.insert(tripsTable)
      .values({
        user_id: owner.id,
        title: 'Test Trip',
        description: 'A trip for testing',
        destination: 'Test City',
        start_date: new Date('2024-06-01'),
        end_date: new Date('2024-06-07'),
        is_public: true // Make it public so outsider can view
      })
      .returning()
      .execute();

    const trip = tripResult[0];

    // Get trip details as outsider
    const result = await getTripDetails(trip.id, outsider.id);

    expect(result.id).toEqual(trip.id);
    expect(result.title).toEqual('Test Trip');
    expect(result.canEdit).toBe(false);
  });

  it('should throw error for non-existent trip', async () => {
    // Create user
    const userResult = await db.insert(usersTable)
      .values({
        email: testUser1.email,
        username: testUser1.username,
        password_hash: 'hashed_password',
        first_name: testUser1.first_name,
        last_name: testUser1.last_name
      })
      .returning()
      .execute();

    const user = userResult[0];

    // Try to get non-existent trip
    await expect(getTripDetails(99999, user.id)).rejects.toThrow(/trip not found/i);
  });
});
