
import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { trpc } from '@/utils/trpc';
import type { Reminder, CreateReminderInput } from '../../../server/src/schema';

interface ReminderManagerProps {
  userId: number;
}

export function ReminderManager({ userId }: ReminderManagerProps) {
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [showCreateReminder, setShowCreateReminder] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const [reminderForm, setReminderForm] = useState<CreateReminderInput>({
    user_id: userId,
    trip_id: 0,
    activity_id: null,
    title: '',
    message: '',
    reminder_time: new Date()
  });

  const loadReminders = useCallback(async () => {
    try {
      setIsLoading(true);
      // Note: Using stub data as the handler returns empty array
      const userReminders = await trpc.getUserReminders.query({ userId });
      setReminders(userReminders);
    } catch (error) {
      console.error('Failed to load reminders:', error);
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    loadReminders();
  }, [loadReminders]);

  const handleCreateReminder = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const newReminder = await trpc.createReminder.mutate(reminderForm);
      setReminders((prev: Reminder[]) => [...prev, newReminder]);
      setReminderForm({
        user_id: userId,
        trip_id: 0,
        activity_id: null,
        title: '',
        message: '',
        reminder_time: new Date()
      });
      setShowCreateReminder(false);
    } catch (error) {
      console.error('Failed to create reminder:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const isUpcoming = (reminderTime: Date) => {
    return reminderTime > new Date();
  };

  const formatReminderTime = (reminderTime: Date) => {
    const now = new Date();
    const timeDiff = reminderTime.getTime() - now.getTime();
    const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24));
    
    if (timeDiff < 0) {
      return '⏰ Past due';
    } else if (daysDiff === 0) {
      return '⏰ Today';
    } else if (daysDiff === 1) {
      return '⏰ Tomorrow';
    } else if (daysDiff <= 7) {
      return `⏰ In ${daysDiff} days`;
    } else {
      return `⏰ ${reminderTime.toLocaleDateString()}`;
    }
  };

  const upcomingReminders = reminders.filter((reminder: Reminder) => isUpcoming(reminder.reminder_time));
  const pastReminders = reminders.filter((reminder: Reminder) => !isUpcoming(reminder.reminder_time));

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Reminders</h2>
          <p className="text-gray-600">Stay on top of your travel plans</p>
        </div>
        <Dialog open={showCreateReminder} onOpenChange={setShowCreateReminder}>
          <DialogTrigger asChild>
            <Button className="bg-purple-600 hover:bg-purple-700">
              ⏰ Create Reminder
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <form onSubmit={handleCreateReminder}>
              <DialogHeader>
                <DialogTitle>Create New Reminder</DialogTitle>
                <DialogDescription>
                  Set up a reminder for your trip activities
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="reminder-title">Reminder Title</Label>
                  <Input
                    id="reminder-title"
                    placeholder="e.g., Pack sunscreen"
                    value={reminderForm.title}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setReminderForm((prev: CreateReminderInput) => ({ ...prev, title: e.target.value }))
                    }
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="reminder-message">Message</Label>
                  <Textarea
                    id="reminder-message"
                    placeholder="Detailed reminder message..."
                    value={reminderForm.message}
                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                      setReminderForm((prev: CreateReminderInput) => ({ ...prev, message: e.target.value }))
                    }
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="trip-id">Trip ID</Label>
                  <Input
                    id="trip-id"
                    type="number"
                    placeholder="Enter trip ID"
                    value={reminderForm.trip_id || ''}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setReminderForm((prev: CreateReminderInput) => ({ 
                        ...prev, 
                        trip_id: parseInt(e.target.value) || 0 
                      }))
                    }
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="activity-id">Activity ID (Optional)</Label>
                  <Input
                    id="activity-id"
                    type="number"
                    placeholder="Enter activity ID"
                    value={reminderForm.activity_id || ''}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setReminderForm((prev: CreateReminderInput) => ({ 
                        ...prev, 
                        activity_id: parseInt(e.target.value) || null 
                      }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="reminder-time">Reminder Date & Time</Label>
                  <Input
                    id="reminder-time"
                    type="datetime-local"
                    value={reminderForm.reminder_time.toISOString().slice(0, 16)}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setReminderForm((prev: CreateReminderInput) => ({ 
                        ...prev, 
                        reminder_time: new Date(e.target.value) 
                      }))
                    }
                    required
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="submit" disabled={isLoading}>
                  {isLoading ? 'Creating...' : 'Create Reminder'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Upcoming Reminders */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-700 flex items-center space-x-2">
          <span>📋</span>
          <span>Upcoming Reminders ({upcomingReminders.length})</span>
        </h3>
        
        {upcomingReminders.length === 0 ? (
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="text-center py-8">
              <div className="text-4xl mb-2">✅</div>
              <p className="text-blue-600">No upcoming reminders</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {upcomingReminders.map((reminder: Reminder) => (
              <Card key={reminder.id} className="bg-white/80 backdrop-blur-sm border-l-4 border-l-blue-500">
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-lg flex items-center space-x-2">
                        <span>📌</span>
                        <span>{reminder.title}</span>
                      </CardTitle>
                      <CardDescription>
                        {formatReminderTime(reminder.reminder_time)}
                      </CardDescription>
                    </div>
                    <Badge variant="outline" className="bg-blue-50 text-blue-600 border-blue-200">
                      Upcoming
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600 mb-2">{reminder.message}</p>
                  <div className="flex items-center space-x-4 text-xs text-gray-400">
                    <span>Trip #{reminder.trip_id}</span>
                    {reminder.activity_id && (
                      <span>Activity #{reminder.activity_id}</span>
                    )}
                    <span>📅 {reminder.reminder_time.toLocaleString()}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Past Reminders */}
      {pastReminders.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-700 flex items-center space-x-2">
            <span>📜</span>
            <span>Past Reminders ({pastReminders.length})</span>
          </h3>
          
          <div className="space-y-3">
            {pastReminders.map((reminder: Reminder) => (
              <Card key={reminder.id} className="bg-gray-50 border-gray-200 opacity-75">
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-lg flex items-center space-x-2 text-gray-600">
                        <span>📌</span>
                        <span>{reminder.title}</span>
                      </CardTitle>
                      <CardDescription>
                        {formatReminderTime(reminder.reminder_time)}
                      </CardDescription>
                    </div>
                    <Badge variant="outline" className="bg-gray-100 text-gray-600 border-gray-300">
                      {reminder.is_sent ? 'Sent' : 'Past Due'}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-500 mb-2">{reminder.message}</p>
                  <div className="flex items-center space-x-4 text-xs text-gray-400">
                    <span>Trip #{reminder.trip_id}</span>
                    {reminder.activity_id && (
                      <span>Activity #{reminder.activity_id}</span>
                    )}
                    <span>📅 {reminder.reminder_time.toLocaleString()}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Loading State */}
      {isLoading && reminders.length === 0 && (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                <div className="h-3 bg-gray-200 rounded w-1/4"></div>
              </CardHeader>
              <CardContent>
                <div className="h-3 bg-gray-200 rounded w-3/4"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!isLoading && reminders.length === 0 && (
        <Card className="text-center py-12 bg-white/80 backdrop-blur-sm">
          <CardContent>
            <div className="text-6xl mb-4">⏰</div>
            <h3 className="text-xl font-semibold text-gray-700 mb-2">No reminders set</h3>
            <p className="text-gray-500">Create reminders to stay organized during your trip</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
