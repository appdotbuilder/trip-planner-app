
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, tripsTable, tripMembersTable } from '../db/schema';
import { type CreateUserInput, type CreateTripInput, type AddTripMemberInput } from '../schema';
import { getUserTrips } from '../handlers/get_user_trips';

// Test user data
const testUser1: CreateUserInput = {
  email: 'user1@example.com',
  username: 'testuser1',
  password: 'password123',
  first_name: 'Test',
  last_name: 'User1'
};

const testUser2: CreateUserInput = {
  email: 'user2@example.com',
  username: 'testuser2',
  password: 'password123',
  first_name: 'Test',
  last_name: 'User2'
};

describe('getUserTrips', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when user has no trips', async () => {
    // Create user but no trips
    const [user] = await db.insert(usersTable)
      .values({
        ...testUser1,
        password_hash: 'hashed_password_123'
      })
      .returning()
      .execute();

    const result = await getUserTrips(user.id);

    expect(result).toHaveLength(0);
  });

  it('should return trips owned by user', async () => {
    // Create user
    const [user] = await db.insert(usersTable)
      .values({
        ...testUser1,
        password_hash: 'hashed_password_123'
      })
      .returning()
      .execute();

    // Create trip owned by user
    const tripInput: CreateTripInput = {
      user_id: user.id,
      title: 'Test Trip',
      description: 'A test trip',
      destination: 'Paris',
      start_date: new Date('2024-06-01'),
      end_date: new Date('2024-06-07'),
      is_public: false
    };

    const [trip] = await db.insert(tripsTable)
      .values(tripInput)
      .returning()
      .execute();

    const result = await getUserTrips(user.id);

    expect(result).toHaveLength(1);
    expect(result[0].id).toEqual(trip.id);
    expect(result[0].title).toEqual('Test Trip');
    expect(result[0].destination).toEqual('Paris');
    expect(result[0].user_id).toEqual(user.id);
    expect(result[0].start_date).toBeInstanceOf(Date);
    expect(result[0].end_date).toBeInstanceOf(Date);
  });

  it('should return trips where user is a member', async () => {
    // Create two users
    const [user1] = await db.insert(usersTable)
      .values({
        ...testUser1,
        password_hash: 'hashed_password_123'
      })
      .returning()
      .execute();

    const [user2] = await db.insert(usersTable)
      .values({
        ...testUser2,
        password_hash: 'hashed_password_456'
      })
      .returning()
      .execute();

    // Create trip owned by user2
    const tripInput: CreateTripInput = {
      user_id: user2.id,
      title: 'Shared Trip',
      description: 'A shared trip',
      destination: 'Tokyo',
      start_date: new Date('2024-07-01'),
      end_date: new Date('2024-07-10'),
      is_public: true
    };

    const [trip] = await db.insert(tripsTable)
      .values(tripInput)
      .returning()
      .execute();

    // Add user1 as member
    const memberInput: AddTripMemberInput = {
      trip_id: trip.id,
      user_id: user1.id,
      role: 'member'
    };

    await db.insert(tripMembersTable)
      .values(memberInput)
      .execute();

    const result = await getUserTrips(user1.id);

    expect(result).toHaveLength(1);
    expect(result[0].id).toEqual(trip.id);
    expect(result[0].title).toEqual('Shared Trip');
    expect(result[0].destination).toEqual('Tokyo');
    expect(result[0].user_id).toEqual(user2.id); // Original owner
  });

  it('should return both owned and member trips without duplicates', async () => {
    // Create two users
    const [user1] = await db.insert(usersTable)
      .values({
        ...testUser1,
        password_hash: 'hashed_password_123'
      })
      .returning()
      .execute();

    const [user2] = await db.insert(usersTable)
      .values({
        ...testUser2,
        password_hash: 'hashed_password_456'
      })
      .returning()
      .execute();

    // Create trip owned by user1
    const ownedTripInput: CreateTripInput = {
      user_id: user1.id,
      title: 'My Trip',
      description: 'Trip I own',
      destination: 'London',
      start_date: new Date('2024-05-01'),
      end_date: new Date('2024-05-07'),
      is_public: false
    };

    const [ownedTrip] = await db.insert(tripsTable)
      .values(ownedTripInput)
      .returning()
      .execute();

    // Create trip owned by user2
    const memberTripInput: CreateTripInput = {
      user_id: user2.id,
      title: 'Member Trip',
      description: 'Trip I am member of',
      destination: 'Rome',
      start_date: new Date('2024-08-01'),
      end_date: new Date('2024-08-07'),
      is_public: true
    };

    const [memberTrip] = await db.insert(tripsTable)
      .values(memberTripInput)
      .returning()
      .execute();

    // Add user1 as member to user2's trip
    await db.insert(tripMembersTable)
      .values({
        trip_id: memberTrip.id,
        user_id: user1.id,
        role: 'member'
      })
      .execute();

    const result = await getUserTrips(user1.id);

    expect(result).toHaveLength(2);
    
    const ownedTripResult = result.find(trip => trip.id === ownedTrip.id);
    const memberTripResult = result.find(trip => trip.id === memberTrip.id);

    expect(ownedTripResult).toBeDefined();
    expect(ownedTripResult?.title).toEqual('My Trip');
    expect(ownedTripResult?.user_id).toEqual(user1.id);

    expect(memberTripResult).toBeDefined();
    expect(memberTripResult?.title).toEqual('Member Trip');
    expect(memberTripResult?.user_id).toEqual(user2.id);
  });

  it('should handle user that does not exist', async () => {
    const result = await getUserTrips(999999);

    expect(result).toHaveLength(0);
  });
});
