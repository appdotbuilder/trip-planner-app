
import { db } from '../db';
import { tripsTable, tripMembersTable } from '../db/schema';
import { type CreateTripInput, type Trip } from '../schema';

export const createTrip = async (input: CreateTripInput): Promise<Trip> => {
  try {
    // Insert trip record
    const tripResult = await db.insert(tripsTable)
      .values({
        user_id: input.user_id,
        title: input.title,
        description: input.description,
        destination: input.destination,
        start_date: input.start_date,
        end_date: input.end_date,
        is_public: input.is_public
      })
      .returning()
      .execute();

    const trip = tripResult[0];

    // Add the creator as the trip owner in trip_members table
    await db.insert(tripMembersTable)
      .values({
        trip_id: trip.id,
        user_id: input.user_id,
        role: 'owner'
      })
      .execute();

    return trip;
  } catch (error) {
    console.error('Trip creation failed:', error);
    throw error;
  }
};
