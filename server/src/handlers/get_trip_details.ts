
import { db } from '../db';
import { tripsTable, tripMembersTable } from '../db/schema';
import { type Trip } from '../schema';
import { eq, and } from 'drizzle-orm';

export const getTripDetails = async (tripId: number, userId: number): Promise<Trip & { canEdit: boolean }> => {
  try {
    // Get trip details
    const tripResults = await db.select()
      .from(tripsTable)
      .where(eq(tripsTable.id, tripId))
      .execute();

    if (tripResults.length === 0) {
      throw new Error('Trip not found');
    }

    const trip = tripResults[0];

    // Check if user is a trip member with any role
    const memberResults = await db.select()
      .from(tripMembersTable)
      .where(
        and(
          eq(tripMembersTable.trip_id, tripId),
          eq(tripMembersTable.user_id, userId)
        )
      )
      .execute();

    // User can edit if they are the trip owner OR a member with owner role
    const canEdit = trip.user_id === userId || 
      memberResults.some(member => member.role === 'owner');

    return {
      ...trip,
      canEdit
    };
  } catch (error) {
    console.error('Get trip details failed:', error);
    throw error;
  }
};
