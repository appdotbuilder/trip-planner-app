
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { tripsTable, tripMembersTable, usersTable } from '../db/schema';
import { type CreateTripInput } from '../schema';
import { createTrip } from '../handlers/create_trip';
import { eq } from 'drizzle-orm';

describe('createTrip', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  let testUserId: number;

  beforeEach(async () => {
    // Create a test user first
    const userResult = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        username: 'testuser',
        password_hash: 'hashedpassword',
        first_name: 'Test',
        last_name: 'User'
      })
      .returning()
      .execute();
    
    testUserId = userResult[0].id;
  });

  const testInput: CreateTripInput = {
    user_id: 0, // Will be set in beforeEach
    title: 'Test Trip',
    description: 'A trip for testing',
    destination: 'Test City',
    start_date: new Date('2024-06-01'),
    end_date: new Date('2024-06-07'),
    is_public: true
  };

  it('should create a trip', async () => {
    const input = { ...testInput, user_id: testUserId };
    const result = await createTrip(input);

    // Basic field validation
    expect(result.user_id).toEqual(testUserId);
    expect(result.title).toEqual('Test Trip');
    expect(result.description).toEqual('A trip for testing');
    expect(result.destination).toEqual('Test City');
    expect(result.start_date).toEqual(new Date('2024-06-01'));
    expect(result.end_date).toEqual(new Date('2024-06-07'));
    expect(result.is_public).toEqual(true);
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should save trip to database', async () => {
    const input = { ...testInput, user_id: testUserId };
    const result = await createTrip(input);

    // Query the trips table
    const trips = await db.select()
      .from(tripsTable)
      .where(eq(tripsTable.id, result.id))
      .execute();

    expect(trips).toHaveLength(1);
    expect(trips[0].user_id).toEqual(testUserId);
    expect(trips[0].title).toEqual('Test Trip');
    expect(trips[0].description).toEqual('A trip for testing');
    expect(trips[0].destination).toEqual('Test City');
    expect(trips[0].is_public).toEqual(true);
    expect(trips[0].created_at).toBeInstanceOf(Date);
    expect(trips[0].updated_at).toBeInstanceOf(Date);
  });

  it('should add creator as trip owner in trip_members table', async () => {
    const input = { ...testInput, user_id: testUserId };
    const result = await createTrip(input);

    // Query the trip_members table
    const tripMembers = await db.select()
      .from(tripMembersTable)
      .where(eq(tripMembersTable.trip_id, result.id))
      .execute();

    expect(tripMembers).toHaveLength(1);
    expect(tripMembers[0].trip_id).toEqual(result.id);
    expect(tripMembers[0].user_id).toEqual(testUserId);
    expect(tripMembers[0].role).toEqual('owner');
    expect(tripMembers[0].joined_at).toBeInstanceOf(Date);
  });

  it('should handle trips with default is_public value', async () => {
    const input = { 
      ...testInput, 
      user_id: testUserId,
      is_public: false // Test with explicit false value
    };
    const result = await createTrip(input);

    expect(result.is_public).toEqual(false);

    // Verify in database
    const trips = await db.select()
      .from(tripsTable)
      .where(eq(tripsTable.id, result.id))
      .execute();

    expect(trips[0].is_public).toEqual(false);
  });

  it('should handle nullable description', async () => {
    const input = { 
      ...testInput, 
      user_id: testUserId,
      description: null
    };
    const result = await createTrip(input);

    expect(result.description).toBeNull();

    // Verify in database
    const trips = await db.select()
      .from(tripsTable)
      .where(eq(tripsTable.id, result.id))
      .execute();

    expect(trips[0].description).toBeNull();
  });

  it('should fail when user_id does not exist', async () => {
    const input = { ...testInput, user_id: 99999 }; // Non-existent user ID
    
    await expect(createTrip(input)).rejects.toThrow(/violates foreign key constraint/i);
  });
});
