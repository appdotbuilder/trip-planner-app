
import { db } from '../db';
import { tripMembersTable, tripsTable, usersTable } from '../db/schema';
import { type AddTripMemberInput, type TripMember } from '../schema';
import { eq, and } from 'drizzle-orm';

export const addTripMember = async (input: AddTripMemberInput): Promise<TripMember> => {
  try {
    // Verify the trip exists
    const trip = await db.select()
      .from(tripsTable)
      .where(eq(tripsTable.id, input.trip_id))
      .execute();

    if (trip.length === 0) {
      throw new Error(`Trip with id ${input.trip_id} not found`);
    }

    // Verify the user exists
    const user = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, input.user_id))
      .execute();

    if (user.length === 0) {
      throw new Error(`User with id ${input.user_id} not found`);
    }

    // Check if user is already a member
    const existingMember = await db.select()
      .from(tripMembersTable)
      .where(
        and(
          eq(tripMembersTable.trip_id, input.trip_id),
          eq(tripMembersTable.user_id, input.user_id)
        )
      )
      .execute();

    if (existingMember.length > 0) {
      throw new Error(`User ${input.user_id} is already a member of trip ${input.trip_id}`);
    }

    // Insert trip member record
    const result = await db.insert(tripMembersTable)
      .values({
        trip_id: input.trip_id,
        user_id: input.user_id,
        role: input.role
      })
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('Adding trip member failed:', error);
    throw error;
  }
};
