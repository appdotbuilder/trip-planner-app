
import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { trpc } from '@/utils/trpc';
import type { Trip, CreateTripInput, DailyItinerary, CreateDailyItineraryInput, Activity, CreateActivityInput } from '../../../server/src/schema';

interface TripPlannerProps {
  userId: number;
  selectedTrip?: Trip;
  onTripCreated: (trip: Trip) => void;
}

type TransportationMethod = 'walking' | 'driving' | 'public_transport' | 'taxi' | 'other';

export function TripPlanner({ userId, selectedTrip, onTripCreated }: TripPlannerProps) {
  const [showCreateTrip, setShowCreateTrip] = useState(false);
  const [showCreateItinerary, setShowCreateItinerary] = useState(false);
  const [showCreateActivity, setShowCreateActivity] = useState(false);
  const [selectedItinerary, setSelectedItinerary] = useState<DailyItinerary | null>(null);
  const [itineraries, setItineraries] = useState<DailyItinerary[]>([]);
  const [activities, setActivities] = useState<Record<number, Activity[]>>({});
  const [isLoading, setIsLoading] = useState(false);

  const [tripForm, setTripForm] = useState<CreateTripInput>({
    user_id: userId,
    title: '',
    description: null,
    destination: '',
    start_date: new Date(),
    end_date: new Date(),
    is_public: false
  });

  const [itineraryForm, setItineraryForm] = useState<CreateDailyItineraryInput>({
    trip_id: selectedTrip?.id || 0,
    date: new Date(),
    title: '',
    notes: null
  });

  const [activityForm, setActivityForm] = useState<CreateActivityInput>({
    daily_itinerary_id: 0,
    title: '',
    description: null,
    location_name: '',
    latitude: null,
    longitude: null,
    start_time: null,
    end_time: null,
    estimated_duration: null,
    transportation_method: null,
    cost_estimate: null,
    order_index: 0
  });

  const loadItineraries = useCallback(async () => {
    if (!selectedTrip) return;
    try {
      // Note: Using stub data as the handler returns empty array
      const tripItineraries = await trpc.getTripItineraries.query({ tripId: selectedTrip.id });
      setItineraries(tripItineraries);
    } catch (error) {
      console.error('Failed to load itineraries:', error);
    }
  }, [selectedTrip]);

  const loadActivities = useCallback(async (itineraryId: number) => {
    try {
      // Note: Using stub data as the handler returns empty array
      const itineraryActivities = await trpc.getItineraryActivities.query({ itineraryId });
      setActivities((prev: Record<number, Activity[]>) => ({
        ...prev,
        [itineraryId]: itineraryActivities
      }));
    } catch (error) {
      console.error('Failed to load activities:', error);
    }
  }, []);

  useEffect(() => {
    if (selectedTrip) {
      loadItineraries();
      setItineraryForm((prev: CreateDailyItineraryInput) => ({
        ...prev,
        trip_id: selectedTrip.id
      }));
    }
  }, [selectedTrip, loadItineraries]);

  useEffect(() => {
    itineraries.forEach((itinerary: DailyItinerary) => {
      if (!activities[itinerary.id]) {
        loadActivities(itinerary.id);
      }
    });
  }, [itineraries, activities, loadActivities]);

  const handleCreateTrip = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const newTrip = await trpc.createTrip.mutate(tripForm);
      onTripCreated(newTrip);
      setTripForm({
        user_id: userId,
        title: '',
        description: null,
        destination: '',
        start_date: new Date(),
        end_date: new Date(),
        is_public: false
      });
      setShowCreateTrip(false);
    } catch (error) {
      console.error('Failed to create trip:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateItinerary = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const newItinerary = await trpc.createDailyItinerary.mutate(itineraryForm);
      setItineraries((prev: DailyItinerary[]) => [...prev, newItinerary]);
      setItineraryForm({
        trip_id: selectedTrip?.id || 0,
        date: new Date(),
        title: '',
        notes: null
      });
      setShowCreateItinerary(false);
    } catch (error) {
      console.error('Failed to create itinerary:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateActivity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItinerary) return;
    
    setIsLoading(true);
    try {
      const currentActivities = activities[selectedItinerary.id] || [];
      const activityData = {
        ...activityForm,
        daily_itinerary_id: selectedItinerary.id,
        order_index: currentActivities.length
      };
      
      const newActivity = await trpc.createActivity.mutate(activityData);
      setActivities((prev: Record<number, Activity[]>) => ({
        ...prev,
        [selectedItinerary.id]: [...(prev[selectedItinerary.id] || []), newActivity]
      }));
      
      setActivityForm({
        daily_itinerary_id: 0,
        title: '',
        description: null,
        location_name: '',
        latitude: null,
        longitude: null,
        start_time: null,
        end_time: null,
        estimated_duration: null,
        transportation_method: null,
        cost_estimate: null,
        order_index: 0
      });
      setShowCreateActivity(false);
      setSelectedItinerary(null);
    } catch (error) {
      console.error('Failed to create activity:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (!selectedTrip) {
    return (
      <div className="space-y-4">
        <Dialog open={showCreateTrip} onOpenChange={setShowCreateTrip}>
          <DialogTrigger asChild>
            <Button className="bg-blue-600 hover:bg-blue-700">
              ✈️ Create New Trip
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px]">
            <form onSubmit={handleCreateTrip}>
              <DialogHeader>
                <DialogTitle>Create New Trip</DialogTitle>
                <DialogDescription>
                  Plan your next adventure by creating a new trip
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Trip Title</Label>
                  <Input
                    id="title"
                    placeholder="e.g., European Adventure"
                    value={tripForm.title}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setTripForm((prev: CreateTripInput) => ({ ...prev, title: e.target.value }))
                    }
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="destination">Destination</Label>
                  <Input
                    id="destination"
                    placeholder="e.g., Paris, France"
                    value={tripForm.destination}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setTripForm((prev: CreateTripInput) => ({ ...prev, destination: e.target.value }))
                    }
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="start_date">Start Date</Label>
                    <Input
                      id="start_date"
                      type="date"
                      value={tripForm.start_date.toISOString().split('T')[0]}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setTripForm((prev: CreateTripInput) => ({ 
                          ...prev, 
                          start_date: new Date(e.target.value) 
                        }))
                      }
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="end_date">End Date</Label>
                    <Input
                      id="end_date"
                      type="date"
                      value={tripForm.end_date.toISOString().split('T')[0]}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setTripForm((prev: CreateTripInput) => ({ 
                          ...prev, 
                          end_date: new Date(e.target.value) 
                        }))
                      }
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description (Optional)</Label>
                  <Textarea
                    id="description"
                    placeholder="Tell us about your trip..."
                    value={tripForm.description || ''}
                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                      setTripForm((prev: CreateTripInput) => ({ 
                        ...prev, 
                        description: e.target.value || null 
                      }))
                    }
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    id="is_public"
                    checked={tripForm.is_public}
                    onCheckedChange={(checked: boolean) =>
                      setTripForm((prev: CreateTripInput) => ({ ...prev, is_public: checked }))
                    }
                  />
                  <Label htmlFor="is_public">Make trip public</Label>
                </div>
              </div>
              <DialogFooter>
                <Button type="submit" disabled={isLoading}>
                  {isLoading ? 'Creating...' : 'Create Trip'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Daily Planning</h2>
          <p className="text-gray-600">Plan each day of your trip in detail</p>
        </div>
        <Dialog open={showCreateItinerary} onOpenChange={setShowCreateItinerary}>
          <DialogTrigger asChild>
            <Button>📅 Add Day</Button>
          </DialogTrigger>
          <DialogContent>
            <form onSubmit={handleCreateItinerary}>
              <DialogHeader>
                <DialogTitle>Add Daily Itinerary</DialogTitle>
                <DialogDescription>
                  Create a plan for a specific day of your trip
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="itinerary-date">Date</Label>
                  <Input
                    id="itinerary-date"
                    type="date"
                    value={itineraryForm.date.toISOString().split('T')[0]}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setItineraryForm((prev: CreateDailyItineraryInput) => ({ 
                        ...prev, 
                        date: new Date(e.target.value) 
                      }))
                    }
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="itinerary-title">Day Title</Label>
                  <Input
                    id="itinerary-title"
                    placeholder="e.g., Exploring Downtown"
                    value={itineraryForm.title}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setItineraryForm((prev: CreateDailyItineraryInput) => ({ 
                        ...prev, 
                        title: e.target.value 
                      }))
                    }
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="itinerary-notes">Notes (Optional)</Label>
                  <Textarea
                    id="itinerary-notes"
                    placeholder="Any special notes for this day..."
                    value={itineraryForm.notes || ''}
                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                      setItineraryForm((prev: CreateDailyItineraryInput) => ({ 
                        ...prev, 
                        notes: e.target.value || null 
                      }))
                    }
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="submit" disabled={isLoading}>
                  {isLoading ? 'Creating...' : 'Add Day'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {itineraries.length === 0 ? (
        <Card className="text-center py-12 bg-white/80 backdrop-blur-sm">
          <CardContent>
            <div className="text-6xl mb-4">📅</div>
            <h3 className="text-xl font-semibold text-gray-700 mb-2">No daily plans yet</h3>
            <p className="text-gray-500">Start by adding a daily itinerary to plan your activities</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {itineraries.map((itinerary: DailyItinerary) => (
            <Card key={itinerary.id} className="bg-white/80 backdrop-blur-sm">
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle className="flex items-center space-x-2">
                      <span>📅</span>
                      <span>{itinerary.title}</span>
                    </CardTitle>
                    <CardDescription>
                      {itinerary.date.toLocaleDateString('en-US', { 
                        weekday: 'long', 
                        year: 'numeric', 
                        month: 'long', 
                        day: 'numeric' 
                      })}
                    </CardDescription>
                  </div>
                  <Button 
                    size="sm"
                    onClick={() => {
                      setSelectedItinerary(itinerary);
                      setShowCreateActivity(true);
                    }}
                  >
                    ➕ Add Activity
                  </Button>
                </div>
                {itinerary.notes && (
                  <p className="text-sm text-gray-600 mt-2">{itinerary.notes}</p>
                )}
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {activities[itinerary.id]?.length > 0 ? (
                    activities[itinerary.id].map((activity: Activity, index: number) => (
                      <div key={activity.id} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                        <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-sm font-medium text-blue-600">
                          {index + 1}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center space-x-2">
                            <h4 className="font-medium">{activity.title}</h4>
                            {activity.transportation_method && (
                              <Badge variant="outline" className="text-xs">
                                {activity.transportation_method}
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-gray-600 flex items-center space-x-1">
                            <span>📍</span>
                            <span>{activity.location_name}</span>
                          </p>
                          {activity.description && (
                            <p className="text-sm text-gray-500 mt-1">{activity.description}</p>
                          )}
                          <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                            {activity.start_time && (
                              <span>⏰ {activity.start_time}</span>
                            )}
                            {activity.estimated_duration && (
                              <span>⏱️ {activity.estimated_duration} min</span>
                            )}
                            {activity.cost_estimate && (
                              <span>💰 ${activity.cost_estimate}</span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <p>No activities planned for this day yet</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create Activity Dialog */}
      <Dialog open={showCreateActivity} onOpenChange={setShowCreateActivity}>
        <DialogContent className="sm:max-w-[600px]">
          <form onSubmit={handleCreateActivity}>
            <DialogHeader>
              <DialogTitle>Add Activity</DialogTitle>
              <DialogDescription>
                Add a new activity to your daily itinerary
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4 max-h-96 overflow-y-auto">
              <div className="space-y-2">
                <Label htmlFor="activity-title">Activity Title</Label>
                <Input
                  id="activity-title"
                  placeholder="e.g., Visit Eiffel Tower"
                  value={activityForm.title}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setActivityForm((prev: CreateActivityInput) => ({ ...prev, title: e.target.value }))
                  }
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="activity-location">Location</Label>
                <Input
                  id="activity-location"
                  placeholder="e.g., Champ de Mars, Paris"
                  value={activityForm.location_name}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setActivityForm((prev: CreateActivityInput) => ({ 
                      ...prev, 
                      location_name: e.target.value 
                    }))
                  }
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="activity-description">Description (Optional)</Label>
                <Textarea
                  id="activity-description"
                  placeholder="Details about this activity..."
                  value={activityForm.description || ''}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                    setActivityForm((prev: CreateActivityInput) => ({ 
                      ...prev, 
                      description: e.target.value || null 
                    }))
                  }
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="start-time">Start Time</Label>
                  <Input
                    id="start-time"
                    type="time"
                    value={activityForm.start_time || ''}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setActivityForm((prev: CreateActivityInput) => ({ 
                        ...prev, 
                        start_time: e.target.value || null 
                      }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="end-time">End Time</Label>
                  <Input
                    id="end-time"
                    type="time"
                    value={activityForm.end_time || ''}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setActivityForm((prev: CreateActivityInput) => ({ 
                        ...prev, 
                        end_time: e.target.value || null 
                      }))
                    }
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="duration">Duration (minutes)</Label>
                  <Input
                    id="duration"
                    type="number"
                    placeholder="120"
                    value={activityForm.estimated_duration || ''}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setActivityForm((prev: CreateActivityInput) => ({ 
                        ...prev, 
                        estimated_duration: parseInt(e.target.value) || null 
                      }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cost">Cost Estimate</Label>
                  <Input
                    id="cost"
                    type="number"
                    step="0.01"
                    placeholder="25.00"
                    value={activityForm.cost_estimate || ''}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setActivityForm((prev: CreateActivityInput) => ({ 
                        ...prev, 
                        cost_estimate: parseFloat(e.target.value) || null 
                      }))
                    }
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="transportation">Transportation Method</Label>
                <Select 
                  value={activityForm.transportation_method || 'walking'}
                  onValueChange={(value: string) =>
                    setActivityForm((prev: CreateActivityInput) => ({ 
                      ...prev, 
                      transportation_method: value as TransportationMethod || null 
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select transportation" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="walking">🚶 Walking</SelectItem>
                    <SelectItem value="driving">🚗 Driving</SelectItem>
                    <SelectItem value="public_transport">🚌 Public Transport</SelectItem>
                    <SelectItem value="taxi">🚕 Taxi</SelectItem>
                    <SelectItem value="other">🔄 Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? 'Adding...' : 'Add Activity'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
