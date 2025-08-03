
import { db } from '../db';
import { activitiesTable } from '../db/schema';
import { eq, asc } from 'drizzle-orm';
import { type Activity } from '../schema';

export const getItineraryActivities = async (itineraryId: number): Promise<Activity[]> => {
  try {
    const results = await db.select()
      .from(activitiesTable)
      .where(eq(activitiesTable.daily_itinerary_id, itineraryId))
      .orderBy(asc(activitiesTable.order_index))
      .execute();

    // Convert numeric fields back to numbers
    return results.map(activity => ({
      ...activity,
      cost_estimate: activity.cost_estimate ? parseFloat(activity.cost_estimate) : null
    }));
  } catch (error) {
    console.error('Failed to fetch itinerary activities:', error);
    throw error;
  }
};
