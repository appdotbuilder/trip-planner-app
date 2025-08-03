
import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Separator } from '@/components/ui/separator';
import { trpc } from '@/utils/trpc';
import { LoginForm } from '@/components/LoginForm';
import { TripPlanner } from '@/components/TripPlanner';
import { ExpenseManager } from '@/components/ExpenseManager';
import { LocationSuggestions } from '@/components/LocationSuggestions';
import { ReminderManager } from '@/components/ReminderManager';
import type { Trip } from '../../server/src/schema';

interface AuthenticatedUser {
  id: number;
  email: string;
  username: string;
}

function App() {
  const [user, setUser] = useState<AuthenticatedUser | null>(null);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [selectedTrip, setSelectedTrip] = useState<Trip | null>(null);
  const [activeTab, setActiveTab] = useState('trips');
  const [isLoading, setIsLoading] = useState(false);
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);

  const loadTrips = useCallback(async () => {
    if (!user) return;
    try {
      setIsLoading(true);
      // Note: Using stub data as the handler returns empty array
      const userTrips = await trpc.getUserTrips.query({ userId: user.id });
      setTrips(userTrips);
    } catch (error) {
      console.error('Failed to load trips:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      loadTrips();
    }
  }, [user, loadTrips]);

  const handleLogin = (authenticatedUser: AuthenticatedUser) => {
    setUser(authenticatedUser);
    setActiveTab('trips');
  };

  const handleLogout = () => {
    setUser(null);
    setTrips([]);
    setSelectedTrip(null);
    setActiveTab('trips');
    setShowLogoutDialog(false);
  };

  const handleTripCreated = (newTrip: Trip) => {
    setTrips((prev: Trip[]) => [...prev, newTrip]);
  };

  const handleTripSelect = (trip: Trip) => {
    setSelectedTrip(trip);
    setActiveTab('planning');
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-gray-800 mb-2">✈️ TripPlanner</h1>
            <p className="text-gray-600">Plan your perfect journey</p>
          </div>
          <LoginForm onLogin={handleLogin} />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <h1 className="text-2xl font-bold text-gray-800">✈️ TripPlanner</h1>
              {selectedTrip && (
                <>
                  <Separator orientation="vertical" className="h-6" />
                  <span className="text-lg text-gray-600">{selectedTrip.title}</span>
                </>
              )}
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="bg-blue-500 text-white text-sm">
                    {user.username.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <span className="text-sm font-medium text-gray-700">{user.username}</span>
              </div>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setShowLogoutDialog(true)}
              >
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-5 bg-white/80 backdrop-blur-sm">
            <TabsTrigger value="trips" className="flex items-center space-x-2">
              <span>🗺️</span>
              <span>My Trips</span>
            </TabsTrigger>
            <TabsTrigger value="planning" disabled={!selectedTrip}>
              <span>📅</span>
              <span>Planning</span>
            </TabsTrigger>
            <TabsTrigger value="expenses" disabled={!selectedTrip}>
              <span>💰</span>
              <span>Expenses</span>
            </TabsTrigger>
            <TabsTrigger value="suggestions">
              <span>📍</span>
              <span>Suggestions</span>
            </TabsTrigger>
            <TabsTrigger value="reminders">
              <span>⏰</span>
              <span>Reminders</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="trips" className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-bold text-gray-800">My Trips</h2>
                <p className="text-gray-600">Plan and manage your travel adventures</p>
              </div>
            </div>

            {isLoading ? (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {[...Array(3)].map((_, i) => (
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
            ) : trips.length === 0 ? (
              <Card className="text-center py-12 bg-white/80 backdrop-blur-sm">
                <CardContent>
                  <div className="text-6xl mb-4">🌍</div>
                  <h3 className="text-xl font-semibold text-gray-700 mb-2">No trips yet</h3>
                  <p className="text-gray-500 mb-6">Create your first trip to start planning your adventure!</p>
                  <TripPlanner userId={user.id} onTripCreated={handleTripCreated} />
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-6">
                <TripPlanner userId={user.id} onTripCreated={handleTripCreated} />
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {trips.map((trip: Trip) => (
                    <Card 
                      key={trip.id} 
                      className="hover:shadow-lg transition-shadow cursor-pointer bg-white/80 backdrop-blur-sm"
                      onClick={() => handleTripSelect(trip)}
                    >
                      <CardHeader>
                        <div className="flex justify-between items-start">
                          <div>
                            <CardTitle className="text-lg">{trip.title}</CardTitle>
                            <CardDescription className="flex items-center space-x-1">
                              <span>📍</span>
                              <span>{trip.destination}</span>
                            </CardDescription>
                          </div>
                          {trip.is_public && (
                            <Badge variant="outline" className="text-xs">Public</Badge>
                          )}
                        </div>
                      </CardHeader>
                      <CardContent>
                        {trip.description && (
                          <p className="text-sm text-gray-600 mb-3 line-clamp-2">{trip.description}</p>
                        )}
                        <div className="flex justify-between text-xs text-gray-500">
                          <span>📅 {trip.start_date.toLocaleDateString()}</span>
                          <span>→ {trip.end_date.toLocaleDateString()}</span>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="planning">
            {selectedTrip && (
              <TripPlanner 
                userId={user.id} 
                selectedTrip={selectedTrip}
                onTripCreated={handleTripCreated}
              />
            )}
          </TabsContent>

          <TabsContent value="expenses">
            {selectedTrip && (
              <ExpenseManager 
                tripId={selectedTrip.id} 
                userId={user.id}
              />
            )}
          </TabsContent>

          <TabsContent value="suggestions">
            <LocationSuggestions />
          </TabsContent>

          <TabsContent value="reminders">
            <ReminderManager userId={user.id} />
          </TabsContent>
        </Tabs>
      </main>

      {/* Logout Confirmation Dialog */}
      <AlertDialog open={showLogoutDialog} onOpenChange={setShowLogoutDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Logout</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to logout? You'll need to sign in again to access your trips.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleLogout}>Logout</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default App;
