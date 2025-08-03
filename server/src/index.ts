
import { initTRPC } from '@trpc/server';
import { createHTTPServer } from '@trpc/server/adapters/standalone';
import 'dotenv/config';
import cors from 'cors';
import superjson from 'superjson';
import { z } from 'zod';

// Import schemas
import { 
  createUserInputSchema, 
  loginInputSchema,
  createTripInputSchema,
  addTripMemberInputSchema,
  createDailyItineraryInputSchema,
  createActivityInputSchema,
  createExpenseInputSchema,
  createReminderInputSchema,
  getLocationSuggestionsInputSchema
} from './schema';

// Import handlers
import { createUser } from './handlers/create_user';
import { loginUser } from './handlers/login_user';
import { createTrip } from './handlers/create_trip';
import { getUserTrips } from './handlers/get_user_trips';
import { getTripDetails } from './handlers/get_trip_details';
import { addTripMember } from './handlers/add_trip_member';
import { createDailyItinerary } from './handlers/create_daily_itinerary';
import { getTripItineraries } from './handlers/get_trip_itineraries';
import { createActivity } from './handlers/create_activity';
import { getItineraryActivities } from './handlers/get_itinerary_activities';
import { createExpense } from './handlers/create_expense';
import { getTripExpenses } from './handlers/get_trip_expenses';
import { getUserExpenseSummary } from './handlers/get_user_expense_summary';
import { settleExpense } from './handlers/settle_expense';
import { getLocationSuggestions } from './handlers/get_location_suggestions';
import { createReminder } from './handlers/create_reminder';
import { getUserReminders } from './handlers/get_user_reminders';
import { updateActivityOrder } from './handlers/update_activity_order';

const t = initTRPC.create({
  transformer: superjson,
});

const publicProcedure = t.procedure;
const router = t.router;

const appRouter = router({
  healthcheck: publicProcedure.query(() => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }),

  // User management
  createUser: publicProcedure
    .input(createUserInputSchema)
    .mutation(({ input }) => createUser(input)),
  
  loginUser: publicProcedure
    .input(loginInputSchema)
    .mutation(({ input }) => loginUser(input)),

  // Trip management
  createTrip: publicProcedure
    .input(createTripInputSchema)
    .mutation(({ input }) => createTrip(input)),
  
  getUserTrips: publicProcedure
    .input(z.object({ userId: z.number() }))
    .query(({ input }) => getUserTrips(input.userId)),
  
  getTripDetails: publicProcedure
    .input(z.object({ tripId: z.number(), userId: z.number() }))
    .query(({ input }) => getTripDetails(input.tripId, input.userId)),
  
  addTripMember: publicProcedure
    .input(addTripMemberInputSchema)
    .mutation(({ input }) => addTripMember(input)),

  // Daily planning
  createDailyItinerary: publicProcedure
    .input(createDailyItineraryInputSchema)
    .mutation(({ input }) => createDailyItinerary(input)),
  
  getTripItineraries: publicProcedure
    .input(z.object({ tripId: z.number() }))
    .query(({ input }) => getTripItineraries(input.tripId)),
  
  createActivity: publicProcedure
    .input(createActivityInputSchema)
    .mutation(({ input }) => createActivity(input)),
  
  getItineraryActivities: publicProcedure
    .input(z.object({ itineraryId: z.number() }))
    .query(({ input }) => getItineraryActivities(input.itineraryId)),
  
  updateActivityOrder: publicProcedure
    .input(z.object({ activityId: z.number(), newOrderIndex: z.number() }))
    .mutation(({ input }) => updateActivityOrder(input.activityId, input.newOrderIndex)),

  // Expense management
  createExpense: publicProcedure
    .input(createExpenseInputSchema)
    .mutation(({ input }) => createExpense(input)),
  
  getTripExpenses: publicProcedure
    .input(z.object({ tripId: z.number() }))
    .query(({ input }) => getTripExpenses(input.tripId)),
  
  getUserExpenseSummary: publicProcedure
    .input(z.object({ tripId: z.number(), userId: z.number() }))
    .query(({ input }) => getUserExpenseSummary(input.tripId, input.userId)),
  
  settleExpense: publicProcedure
    .input(z.object({ expenseId: z.number(), userId: z.number() }))
    .mutation(({ input }) => settleExpense(input.expenseId, input.userId)),

  // Location suggestions
  getLocationSuggestions: publicProcedure
    .input(getLocationSuggestionsInputSchema)
    .query(({ input }) => getLocationSuggestions(input)),

  // Reminders
  createReminder: publicProcedure
    .input(createReminderInputSchema)
    .mutation(({ input }) => createReminder(input)),
  
  getUserReminders: publicProcedure
    .input(z.object({ userId: z.number() }))
    .query(({ input }) => getUserReminders(input.userId))
});

export type AppRouter = typeof appRouter;

async function start() {
  const port = process.env['SERVER_PORT'] || 2022;
  const server = createHTTPServer({
    middleware: (req, res, next) => {
      cors()(req, res, next);
    },
    router: appRouter,
    createContext() {
      return {};
    },
  });
  server.listen(port);
  console.log(`TRPC server listening at port: ${port}`);
}

start();
