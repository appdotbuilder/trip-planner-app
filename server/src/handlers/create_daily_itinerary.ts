
import { db } from '../db';
import { dailyItinerariesTable } from '../db/schema';
import { type CreateDailyItineraryInput, type DailyItinerary } from '../schema';

export const createDailyItinerary = async (input: CreateDailyItineraryInput): Promise<DailyItinerary> => {
  try {
    // Insert daily itinerary record
    const result = await db.insert(dailyItinerariesTable)
      .values({
        trip_id: input.trip_id,
        date: input.date,
        title: input.title,
        notes: input.notes
      })
      .returning()
      .execute();

    const dailyItinerary = result[0];
    return dailyItinerary;
  } catch (error) {
    console.error('Daily itinerary creation failed:', error);
    throw error;
  }
};
