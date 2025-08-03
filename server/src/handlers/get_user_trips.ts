
import { db } from '../db';
import { tripsTable, tripMembersTable } from '../db/schema';
import { type Trip } from '../schema';
import { eq, or } from 'drizzle-orm';

export const getUserTrips = async (userId: number): Promise<Trip[]> => {
  try {
    // Get trips where user is either the owner OR a member
    const results = await db.select({
      id: tripsTable.id,
      user_id: tripsTable.user_id,
      title: tripsTable.title,
      description: tripsTable.description,
      destination: tripsTable.destination,
      start_date: tripsTable.start_date,
      end_date: tripsTable.end_date,
      is_public: tripsTable.is_public,
      created_at: tripsTable.created_at,
      updated_at: tripsTable.updated_at
    })
    .from(tripsTable)
    .leftJoin(tripMembersTable, eq(tripsTable.id, tripMembersTable.trip_id))
    .where(or(
      eq(tripsTable.user_id, userId),
      eq(tripMembersTable.user_id, userId)
    ))
    .execute();

    // Remove duplicates (a user might appear as both owner and member)
    const uniqueTrips = new Map<number, Trip>();
    
    results.forEach(result => {
      if (!uniqueTrips.has(result.id)) {
        uniqueTrips.set(result.id, {
          id: result.id,
          user_id: result.user_id,
          title: result.title,
          description: result.description,
          destination: result.destination,
          start_date: result.start_date,
          end_date: result.end_date,
          is_public: result.is_public,
          created_at: result.created_at,
          updated_at: result.updated_at
        });
      }
    });

    return Array.from(uniqueTrips.values());
  } catch (error) {
    console.error('Failed to get user trips:', error);
    throw error;
  }
};
