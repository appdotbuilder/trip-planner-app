
import { db } from '../db';
import { activitiesTable } from '../db/schema';
import { type CreateActivityInput, type Activity } from '../schema';

export const createActivity = async (input: CreateActivityInput): Promise<Activity> => {
  try {
    // Insert activity record
    const result = await db.insert(activitiesTable)
      .values({
        daily_itinerary_id: input.daily_itinerary_id,
        title: input.title,
        description: input.description,
        location_name: input.location_name,
        latitude: input.latitude,
        longitude: input.longitude,
        start_time: input.start_time,
        end_time: input.end_time,
        estimated_duration: input.estimated_duration,
        transportation_method: input.transportation_method,
        cost_estimate: input.cost_estimate ? input.cost_estimate.toString() : null, // Convert number to string for numeric column
        order_index: input.order_index
      })
      .returning()
      .execute();

    // Convert numeric fields back to numbers before returning
    const activity = result[0];
    return {
      ...activity,
      cost_estimate: activity.cost_estimate ? parseFloat(activity.cost_estimate) : null // Convert string back to number
    };
  } catch (error) {
    console.error('Activity creation failed:', error);
    throw error;
  }
};
