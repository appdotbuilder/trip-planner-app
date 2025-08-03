
import { db } from '../db';
import { locationSuggestionsTable } from '../db/schema';
import { type GetLocationSuggestionsInput, type LocationSuggestion } from '../schema';
import { eq, and, ilike, SQL } from 'drizzle-orm';

export const getLocationSuggestions = async (input: GetLocationSuggestionsInput): Promise<LocationSuggestion[]> => {
  try {
    // Build conditions array for filtering
    const conditions: SQL<unknown>[] = [];

    // Filter by area (case-insensitive partial match)
    conditions.push(ilike(locationSuggestionsTable.area, `%${input.area}%`));

    // Filter by category if provided
    if (input.category) {
      conditions.push(eq(locationSuggestionsTable.category, input.category));
    }

    // Build and execute the query
    const results = await db.select()
      .from(locationSuggestionsTable)
      .where(and(...conditions))
      .limit(input.limit)
      .execute();

    // Return results - no type conversion needed for this table
    return results;
  } catch (error) {
    console.error('Failed to get location suggestions:', error);
    throw error;
  }
};
