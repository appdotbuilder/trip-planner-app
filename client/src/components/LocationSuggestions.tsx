
import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { trpc } from '@/utils/trpc';
import type { LocationSuggestion, GetLocationSuggestionsInput } from '../../../server/src/schema';

type LocationCategory = 'restaurant' | 'attraction' | 'hotel' | 'activity' | 'transport' | 'other';

export function LocationSuggestions() {
  const [suggestions, setSuggestions] = useState<LocationSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchForm, setSearchForm] = useState<GetLocationSuggestionsInput>({
    area: '',
    category: undefined,
    limit: 20
  });

  const handleSearch = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchForm.area.trim()) return;
    
    setIsLoading(true);
    try {
      // Note: Using stub data as the handler returns empty array
      const results = await trpc.getLocationSuggestions.query(searchForm);
      setSuggestions(results);
    } catch (error) {
      console.error('Failed to load suggestions:', error);
    } finally {
      setIsLoading(false);
    }
  }, [searchForm]);

  const getCategoryEmoji = (category: string) => {
    const emojis: Record<string, string> = {
      restaurant: '🍽️',
      attraction: '🎡',
      hotel: '🏨',
      activity: '🎯',
      transport: '🚗',
      other: '📍'
    };
    return emojis[category] || '📍';
  };

  const getPriceLevelText = (level: number | null) => {
    if (!level) return null;
    const levels: Record<number, string> = {
      1: '💰 Budget',
      2: '💰💰 Moderate',
      3: '💰💰💰 Expensive',
      4: '💰💰💰💰 Very Expensive'
    };
    return levels[level] || null;
  };

  const getStarRating = (rating: number | null) => {
    if (!rating) return null;
    const stars = Math.round(rating);
    return '⭐'.repeat(Math.min(stars, 5));
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-800">Location Suggestions</h2>
        <p className="text-gray-600">Discover amazing places to visit during your trip</p>
      </div>

      {/* Search Form */}
      <Card className="bg-white/80 backdrop-blur-sm">
        <CardHeader>
          <CardTitle>Search Locations</CardTitle>
          <CardDescription>Find restaurants, attractions, and activities</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSearch} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="area">Area/City</Label>
                <Input
                  id="area"
                  placeholder="e.g., Paris, New York, Tokyo"
                  value={searchForm.area}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setSearchForm((prev: GetLocationSuggestionsInput) => ({ 
                      ...prev, 
                      area: e.target.value 
                    }))
                  }
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="category">Category (Optional)</Label>
                <Select
                  value={searchForm.category || 'all'}
                  onValueChange={(value: string) =>
                    setSearchForm((prev: GetLocationSuggestionsInput) => ({ 
                      ...prev, 
                      category: value === 'all' ? undefined : value as LocationCategory
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All categories" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    <SelectItem value="restaurant">🍽️ Restaurants</SelectItem>
                    <SelectItem value="attraction">🎡 Attractions</SelectItem>
                    <SelectItem value="hotel">🏨 Hotels</SelectItem>
                    <SelectItem value="activity">🎯 Activities</SelectItem>
                    <SelectItem value="transport">🚗 Transportation</SelectItem>
                    <SelectItem value="other">📍 Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="limit">Results Limit</Label>
                <Select
                  value={searchForm.limit.toString()}
                  onValueChange={(value: string) =>
                    setSearchForm((prev: GetLocationSuggestionsInput) => ({ 
                      ...prev, 
                      limit: parseInt(value) 
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10">10 results</SelectItem>
                    <SelectItem value="20">20 results</SelectItem>
                    <SelectItem value="50">50 results</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button type="submit" disabled={isLoading || !searchForm.area.trim()}>
              {isLoading ? 'Searching...' : '🔍 Search Locations'}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Results */}
      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="h-3 bg-gray-200 rounded"></div>
                  <div className="h-3 bg-gray-200 rounded w-2/3"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : suggestions.length === 0 ? (
        <Card className="text-center py-12 bg-white/80 backdrop-blur-sm">
          <CardContent>
            <div className="text-6xl mb-4">🌍</div>
            <h3 className="text-xl font-semibold text-gray-700 mb-2">No suggestions yet</h3>
            <p className="text-gray-500">
              {searchForm.area 
                ? 'No locations found for your search. Try a different area or category.'
                : 'Enter a location to discover amazing places to visit!'
              }
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold text-gray-700">
              Found {suggestions.length} suggestion{suggestions.length !== 1 ? 's' : ''} 
              {searchForm.area && ` in ${searchForm.area}`}
            </h3>
            {searchForm.category && (
              <Badge variant="outline">
                {getCategoryEmoji(searchForm.category)} {searchForm.category}
              </Badge>
            )}
          </div>
          
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {suggestions.map((suggestion: LocationSuggestion) => (
              <Card 
                key={suggestion.id} 
                className="hover:shadow-lg transition-shadow bg-white/80 backdrop-blur-sm"
              >
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div className="flex items-center space-x-2">
                      <span className="text-xl">
                        {getCategoryEmoji(suggestion.category)}
                      </span>
                      <div>
                        <CardTitle className="text-lg">{suggestion.name}</CardTitle>
                        <CardDescription>
                          <Badge variant="outline" className="text-xs">
                            {suggestion.category}
                          </Badge>
                        </CardDescription>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {suggestion.description && (
                    <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                      {suggestion.description}
                    </p>
                  )}
                  
                  <div className="space-y-2">
                    {suggestion.area && (
                      <div className="flex items-center text-sm text-gray-500">
                        <span>📍 {suggestion.area}</span>
                      </div>
                    )}
                    
                    {suggestion.rating && (
                      <div className="flex items-center text-sm">
                        <span>{getStarRating(suggestion.rating)}</span>
                        <span className="ml-1 text-gray-600">
                          {suggestion.rating.toFixed(1)}
                        </span>
                      </div>
                    )}
                    
                    {suggestion.price_level && (
                      <div className="text-sm">
                        {getPriceLevelText(suggestion.price_level)}
                      </div>
                    )}
                    
                    <div className="flex items-center justify-between pt-2 text-xs text-gray-400">
                      <span>
                        📍 {suggestion.latitude?.toFixed(4)}, {suggestion.longitude?.toFixed(4)}
                      </span>
                      <Button size="sm" variant="outline">
                        Add to Trip
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
