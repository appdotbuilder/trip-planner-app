
import { db } from '../db';
import { activitiesTable } from '../db/schema';
import { eq, and, gte, lte, gt, lt, sql } from 'drizzle-orm';

export const updateActivityOrder = async (activityId: number, newOrderIndex: number): Promise<{ success: boolean }> => {
  try {
    // First, get the current activity to find its daily_itinerary_id and current order_index
    const currentActivity = await db.select()
      .from(activitiesTable)
      .where(eq(activitiesTable.id, activityId))
      .execute();

    if (currentActivity.length === 0) {
      throw new Error('Activity not found');
    }

    const activity = currentActivity[0];
    const currentOrderIndex = activity.order_index;
    const dailyItineraryId = activity.daily_itinerary_id;

    // If the order index hasn't changed, no work needed
    if (currentOrderIndex === newOrderIndex) {
      return { success: true };
    }

    // Begin transaction by updating other activities first
    if (currentOrderIndex < newOrderIndex) {
      // Moving down: shift activities between current+1 and new position up by 1
      await db.update(activitiesTable)
        .set({ 
          order_index: sql`${activitiesTable.order_index} - 1`,
          updated_at: new Date()
        })
        .where(and(
          eq(activitiesTable.daily_itinerary_id, dailyItineraryId),
          gt(activitiesTable.order_index, currentOrderIndex),
          lte(activitiesTable.order_index, newOrderIndex)
        ))
        .execute();
    } else {
      // Moving up: shift activities between new position and current-1 down by 1
      await db.update(activitiesTable)
        .set({ 
          order_index: sql`${activitiesTable.order_index} + 1`,
          updated_at: new Date()
        })
        .where(and(
          eq(activitiesTable.daily_itinerary_id, dailyItineraryId),
          gte(activitiesTable.order_index, newOrderIndex),
          lt(activitiesTable.order_index, currentOrderIndex)
        ))
        .execute();
    }

    // Finally, update the target activity to its new position
    await db.update(activitiesTable)
      .set({ 
        order_index: newOrderIndex,
        updated_at: new Date()
      })
      .where(eq(activitiesTable.id, activityId))
      .execute();

    return { success: true };
  } catch (error) {
    console.error('Activity order update failed:', error);
    throw error;
  }
};
