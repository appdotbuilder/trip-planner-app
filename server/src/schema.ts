
import { z } from 'zod';

// User schema
export const userSchema = z.object({
  id: z.number(),
  email: z.string().email(),
  username: z.string(),
  password_hash: z.string(),
  first_name: z.string().nullable(),
  last_name: z.string().nullable(),
  avatar_url: z.string().nullable(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type User = z.infer<typeof userSchema>;

// Trip schema
export const tripSchema = z.object({
  id: z.number(),
  user_id: z.number(),
  title: z.string(),
  description: z.string().nullable(),
  destination: z.string(),
  start_date: z.coerce.date(),
  end_date: z.coerce.date(),
  is_public: z.boolean(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type Trip = z.infer<typeof tripSchema>;

// Trip member schema
export const tripMemberSchema = z.object({
  id: z.number(),
  trip_id: z.number(),
  user_id: z.number(),
  role: z.enum(['owner', 'member']),
  joined_at: z.coerce.date()
});

export type TripMember = z.infer<typeof tripMemberSchema>;

// Daily itinerary schema
export const dailyItinerarySchema = z.object({
  id: z.number(),
  trip_id: z.number(),
  date: z.coerce.date(),
  title: z.string(),
  notes: z.string().nullable(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type DailyItinerary = z.infer<typeof dailyItinerarySchema>;

// Activity schema
export const activitySchema = z.object({
  id: z.number(),
  daily_itinerary_id: z.number(),
  title: z.string(),
  description: z.string().nullable(),
  location_name: z.string(),
  latitude: z.number().nullable(),
  longitude: z.number().nullable(),
  start_time: z.string().nullable(), // Time format HH:MM
  end_time: z.string().nullable(),
  estimated_duration: z.number().nullable(), // Duration in minutes
  transportation_method: z.enum(['walking', 'driving', 'public_transport', 'taxi', 'other']).nullable(),
  cost_estimate: z.number().nullable(),
  order_index: z.number().int(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type Activity = z.infer<typeof activitySchema>;

// Expense schema
export const expenseSchema = z.object({
  id: z.number(),
  trip_id: z.number(),
  payer_id: z.number(),
  title: z.string(),
  description: z.string().nullable(),
  amount: z.number(),
  currency: z.string(),
  category: z.enum(['accommodation', 'food', 'transport', 'entertainment', 'shopping', 'other']),
  expense_date: z.coerce.date(),
  created_at: z.coerce.date()
});

export type Expense = z.infer<typeof expenseSchema>;

// Expense split schema
export const expenseSplitSchema = z.object({
  id: z.number(),
  expense_id: z.number(),
  user_id: z.number(),
  amount: z.number(),
  is_settled: z.boolean()
});

export type ExpenseSplit = z.infer<typeof expenseSplitSchema>;

// Location suggestion schema
export const locationSuggestionSchema = z.object({
  id: z.number(),
  name: z.string(),
  description: z.string().nullable(),
  latitude: z.number(),
  longitude: z.number(),
  category: z.enum(['restaurant', 'attraction', 'hotel', 'activity', 'transport', 'other']),
  rating: z.number().nullable(),
  price_level: z.number().int().nullable(), // 1-4 scale
  area: z.string().nullable(),
  created_at: z.coerce.date()
});

export type LocationSuggestion = z.infer<typeof locationSuggestionSchema>;

// Reminder schema
export const reminderSchema = z.object({
  id: z.number(),
  user_id: z.number(),
  trip_id: z.number(),
  activity_id: z.number().nullable(),
  title: z.string(),
  message: z.string(),
  reminder_time: z.coerce.date(),
  is_sent: z.boolean(),
  created_at: z.coerce.date()
});

export type Reminder = z.infer<typeof reminderSchema>;

// Input schemas
export const createUserInputSchema = z.object({
  email: z.string().email(),
  username: z.string().min(1),
  password: z.string().min(6),
  first_name: z.string().nullable(),
  last_name: z.string().nullable()
});

export type CreateUserInput = z.infer<typeof createUserInputSchema>;

export const createTripInputSchema = z.object({
  user_id: z.number(),
  title: z.string().min(1),
  description: z.string().nullable(),
  destination: z.string().min(1),
  start_date: z.coerce.date(),
  end_date: z.coerce.date(),
  is_public: z.boolean().default(false)
});

export type CreateTripInput = z.infer<typeof createTripInputSchema>;

export const createDailyItineraryInputSchema = z.object({
  trip_id: z.number(),
  date: z.coerce.date(),
  title: z.string().min(1),
  notes: z.string().nullable()
});

export type CreateDailyItineraryInput = z.infer<typeof createDailyItineraryInputSchema>;

export const createActivityInputSchema = z.object({
  daily_itinerary_id: z.number(),
  title: z.string().min(1),
  description: z.string().nullable(),
  location_name: z.string().min(1),
  latitude: z.number().nullable(),
  longitude: z.number().nullable(),
  start_time: z.string().nullable(),
  end_time: z.string().nullable(),
  estimated_duration: z.number().nullable(),
  transportation_method: z.enum(['walking', 'driving', 'public_transport', 'taxi', 'other']).nullable(),
  cost_estimate: z.number().nullable(),
  order_index: z.number().int()
});

export type CreateActivityInput = z.infer<typeof createActivityInputSchema>;

export const createExpenseInputSchema = z.object({
  trip_id: z.number(),
  payer_id: z.number(),
  title: z.string().min(1),
  description: z.string().nullable(),
  amount: z.number().positive(),
  currency: z.string().length(3),
  category: z.enum(['accommodation', 'food', 'transport', 'entertainment', 'shopping', 'other']),
  expense_date: z.coerce.date(),
  split_with: z.array(z.object({
    user_id: z.number(),
    amount: z.number().positive()
  }))
});

export type CreateExpenseInput = z.infer<typeof createExpenseInputSchema>;

export const createReminderInputSchema = z.object({
  user_id: z.number(),
  trip_id: z.number(),
  activity_id: z.number().nullable(),
  title: z.string().min(1),
  message: z.string().min(1),
  reminder_time: z.coerce.date()
});

export type CreateReminderInput = z.infer<typeof createReminderInputSchema>;

export const loginInputSchema = z.object({
  email: z.string().email(),
  password: z.string()
});

export type LoginInput = z.infer<typeof loginInputSchema>;

export const addTripMemberInputSchema = z.object({
  trip_id: z.number(),
  user_id: z.number(),
  role: z.enum(['owner', 'member']).default('member')
});

export type AddTripMemberInput = z.infer<typeof addTripMemberInputSchema>;

export const getLocationSuggestionsInputSchema = z.object({
  area: z.string(),
  category: z.enum(['restaurant', 'attraction', 'hotel', 'activity', 'transport', 'other']).optional(),
  limit: z.number().int().positive().default(20)
});

export type GetLocationSuggestionsInput = z.infer<typeof getLocationSuggestionsInputSchema>;
