
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, tripsTable, tripMembersTable } from '../db/schema';
import { type AddTripMemberInput } from '../schema';
import { addTripMember } from '../handlers/add_trip_member';
import { eq, and } from 'drizzle-orm';

describe('addTripMember', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  let testUser: { id: number };
  let testTrip: { id: number };
  let memberUser: { id: number };

  beforeEach(async () => {
    // Create test user (trip owner)
    const userResult = await db.insert(usersTable)
      .values({
        email: 'owner@test.com',
        username: 'owner',
        password_hash: 'hashedpassword'
      })
      .returning()
      .execute();
    testUser = userResult[0];

    // Create test trip
    const tripResult = await db.insert(tripsTable)
      .values({
        user_id: testUser.id,
        title: 'Test Trip',
        destination: 'Test Destination',
        start_date: new Date('2024-01-01'),
        end_date: new Date('2024-01-07')
      })
      .returning()
      .execute();
    testTrip = tripResult[0];

    // Create member user
    const memberResult = await db.insert(usersTable)
      .values({
        email: 'member@test.com',
        username: 'member',
        password_hash: 'hashedpassword'
      })
      .returning()
      .execute();
    memberUser = memberResult[0];
  });

  const testInput: AddTripMemberInput = {
    trip_id: 0, // Will be set in tests
    user_id: 0, // Will be set in tests
    role: 'member'
  };

  it('should add a member to a trip', async () => {
    const input = {
      ...testInput,
      trip_id: testTrip.id,
      user_id: memberUser.id
    };

    const result = await addTripMember(input);

    expect(result.trip_id).toEqual(testTrip.id);
    expect(result.user_id).toEqual(memberUser.id);
    expect(result.role).toEqual('member');
    expect(result.id).toBeDefined();
    expect(result.joined_at).toBeInstanceOf(Date);
  });

  it('should save trip member to database', async () => {
    const input = {
      ...testInput,
      trip_id: testTrip.id,
      user_id: memberUser.id
    };

    const result = await addTripMember(input);

    const members = await db.select()
      .from(tripMembersTable)
      .where(eq(tripMembersTable.id, result.id))
      .execute();

    expect(members).toHaveLength(1);
    expect(members[0].trip_id).toEqual(testTrip.id);
    expect(members[0].user_id).toEqual(memberUser.id);
    expect(members[0].role).toEqual('member');
    expect(members[0].joined_at).toBeInstanceOf(Date);
  });

  it('should add member with owner role', async () => {
    const input = {
      ...testInput,
      trip_id: testTrip.id,
      user_id: memberUser.id,
      role: 'owner' as const
    };

    const result = await addTripMember(input);

    expect(result.role).toEqual('owner');

    const members = await db.select()
      .from(tripMembersTable)
      .where(eq(tripMembersTable.id, result.id))
      .execute();

    expect(members[0].role).toEqual('owner');
  });

  it('should throw error when trip does not exist', async () => {
    const input = {
      ...testInput,
      trip_id: 99999,
      user_id: memberUser.id
    };

    await expect(addTripMember(input)).rejects.toThrow(/trip with id 99999 not found/i);
  });

  it('should throw error when user does not exist', async () => {
    const input = {
      ...testInput,
      trip_id: testTrip.id,
      user_id: 99999
    };

    await expect(addTripMember(input)).rejects.toThrow(/user with id 99999 not found/i);
  });

  it('should throw error when user is already a member', async () => {
    const input = {
      ...testInput,
      trip_id: testTrip.id,
      user_id: memberUser.id
    };

    // Add the member first time
    await addTripMember(input);

    // Try to add the same member again
    await expect(addTripMember(input)).rejects.toThrow(/user .* is already a member of trip/i);
  });

  it('should verify member exists in database after adding', async () => {
    const input = {
      ...testInput,
      trip_id: testTrip.id,
      user_id: memberUser.id
    };

    await addTripMember(input);

    const members = await db.select()
      .from(tripMembersTable)
      .where(
        and(
          eq(tripMembersTable.trip_id, testTrip.id),
          eq(tripMembersTable.user_id, memberUser.id)
        )
      )
      .execute();

    expect(members).toHaveLength(1);
    expect(members[0].trip_id).toEqual(testTrip.id);
    expect(members[0].user_id).toEqual(memberUser.id);
  });
});
