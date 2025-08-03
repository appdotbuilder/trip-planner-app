
import { db } from '../db';
import { dailyItinerariesTable } from '../db/schema';
import { type DailyItinerary } from '../schema';
import { eq, asc } from 'drizzle-orm';

export const getTripItineraries = async (tripId: number): Promise<DailyItinerary[]> => {
  try {
    const results = await db.select()
      .from(dailyItinerariesTable)
      .where(eq(dailyItinerariesTable.trip_id, tripId))
      .orderBy(asc(dailyItinerariesTable.date))
      .execute();

    return results;
  } catch (error) {
    console.error('Failed to get trip itineraries:', error);
    throw error;
  }
};
