
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { locationSuggestionsTable } from '../db/schema';
import { type GetLocationSuggestionsInput } from '../schema';
import { getLocationSuggestions } from '../handlers/get_location_suggestions';

// Test data for location suggestions
const testLocationSuggestions = [
  {
    name: 'Great Restaurant',
    description: 'Amazing local food',
    latitude: 40.7128,
    longitude: -74.0060,
    category: 'restaurant' as const,
    rating: 4.5,
    price_level: 3,
    area: 'New York'
  },
  {
    name: 'Central Park',
    description: 'Beautiful city park',
    latitude: 40.7829,
    longitude: -73.9654,
    category: 'attraction' as const,
    rating: 4.8,
    price_level: null,
    area: 'New York'
  },
  {
    name: 'Luxury Hotel',
    description: 'Five star accommodation',
    latitude: 40.7589,
    longitude: -73.9851,
    category: 'hotel' as const,
    rating: 4.2,
    price_level: 4,
    area: 'New York'
  },
  {
    name: 'Paris Bistro',
    description: 'Authentic French cuisine',
    latitude: 48.8566,
    longitude: 2.3522,
    category: 'restaurant' as const,
    rating: 4.0,
    price_level: 2,
    area: 'Paris'
  }
];

describe('getLocationSuggestions', () => {
  beforeEach(async () => {
    await createDB();
    
    // Insert test location suggestions
    await db.insert(locationSuggestionsTable)
      .values(testLocationSuggestions)
      .execute();
  });

  afterEach(resetDB);

  it('should get location suggestions by area', async () => {
    const input: GetLocationSuggestionsInput = {
      area: 'New York',
      limit: 20
    };

    const result = await getLocationSuggestions(input);

    expect(result).toHaveLength(3);
    result.forEach(suggestion => {
      expect(suggestion.area).toEqual('New York');
      expect(suggestion.id).toBeDefined();
      expect(suggestion.name).toBeDefined();
      expect(suggestion.latitude).toBeTypeOf('number');
      expect(suggestion.longitude).toBeTypeOf('number');
      expect(suggestion.created_at).toBeInstanceOf(Date);
    });
  });

  it('should filter by category when provided', async () => {
    const input: GetLocationSuggestionsInput = {
      area: 'New York',
      category: 'restaurant',
      limit: 20
    };

    const result = await getLocationSuggestions(input);

    expect(result).toHaveLength(1);
    expect(result[0].name).toEqual('Great Restaurant');
    expect(result[0].category).toEqual('restaurant');
    expect(result[0].area).toEqual('New York');
  });

  it('should handle partial area matches (case insensitive)', async () => {
    const input: GetLocationSuggestionsInput = {
      area: 'york',
      limit: 20
    };

    const result = await getLocationSuggestions(input);

    expect(result).toHaveLength(3);
    result.forEach(suggestion => {
      expect(suggestion.area?.toLowerCase()).toContain('york');
    });
  });

  it('should respect limit parameter', async () => {
    const input: GetLocationSuggestionsInput = {
      area: 'New York',
      limit: 2
    };

    const result = await getLocationSuggestions(input);

    expect(result).toHaveLength(2);
  });

  it('should return empty array when no matches found', async () => {
    const input: GetLocationSuggestionsInput = {
      area: 'Nonexistent City',
      limit: 20
    };

    const result = await getLocationSuggestions(input);

    expect(result).toHaveLength(0);
  });

  it('should handle null rating values correctly', async () => {
    const input: GetLocationSuggestionsInput = {
      area: 'New York',
      category: 'attraction',
      limit: 20
    };

    const result = await getLocationSuggestions(input);

    expect(result).toHaveLength(1);
    expect(result[0].name).toEqual('Central Park');
    expect(result[0].rating).toEqual(4.8);
    expect(result[0].price_level).toBeNull();
  });

  it('should return all location fields correctly', async () => {
    const input: GetLocationSuggestionsInput = {
      area: 'New York',
      category: 'restaurant',
      limit: 20
    };

    const result = await getLocationSuggestions(input);

    expect(result).toHaveLength(1);
    const suggestion = result[0];

    expect(suggestion.id).toBeDefined();
    expect(suggestion.name).toEqual('Great Restaurant');
    expect(suggestion.description).toEqual('Amazing local food');
    expect(suggestion.latitude).toEqual(40.7128);
    expect(suggestion.longitude).toEqual(-74.0060);
    expect(suggestion.category).toEqual('restaurant');
    expect(suggestion.rating).toEqual(4.5);
    expect(suggestion.price_level).toEqual(3);
    expect(suggestion.area).toEqual('New York');
    expect(suggestion.created_at).toBeInstanceOf(Date);
  });
});
