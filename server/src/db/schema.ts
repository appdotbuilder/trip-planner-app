
import { serial, text, pgTable, timestamp, numeric, integer, boolean, pgEnum, real } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Enums
export const memberRoleEnum = pgEnum('member_role', ['owner', 'member']);
export const transportationMethodEnum = pgEnum('transportation_method', ['walking', 'driving', 'public_transport', 'taxi', 'other']);
export const expenseCategoryEnum = pgEnum('expense_category', ['accommodation', 'food', 'transport', 'entertainment', 'shopping', 'other']);
export const locationCategoryEnum = pgEnum('location_category', ['restaurant', 'attraction', 'hotel', 'activity', 'transport', 'other']);

// Users table
export const usersTable = pgTable('users', {
  id: serial('id').primaryKey(),
  email: text('email').notNull().unique(),
  username: text('username').notNull().unique(),
  password_hash: text('password_hash').notNull(),
  first_name: text('first_name'),
  last_name: text('last_name'),
  avatar_url: text('avatar_url'),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull()
});

// Trips table
export const tripsTable = pgTable('trips', {
  id: serial('id').primaryKey(),
  user_id: integer('user_id').references(() => usersTable.id).notNull(),
  title: text('title').notNull(),
  description: text('description'),
  destination: text('destination').notNull(),
  start_date: timestamp('start_date').notNull(),
  end_date: timestamp('end_date').notNull(),
  is_public: boolean('is_public').default(false).notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull()
});

// Trip members table
export const tripMembersTable = pgTable('trip_members', {
  id: serial('id').primaryKey(),
  trip_id: integer('trip_id').references(() => tripsTable.id).notNull(),
  user_id: integer('user_id').references(() => usersTable.id).notNull(),
  role: memberRoleEnum('role').default('member').notNull(),
  joined_at: timestamp('joined_at').defaultNow().notNull()
});

// Daily itineraries table
export const dailyItinerariesTable = pgTable('daily_itineraries', {
  id: serial('id').primaryKey(),
  trip_id: integer('trip_id').references(() => tripsTable.id).notNull(),
  date: timestamp('date').notNull(),
  title: text('title').notNull(),
  notes: text('notes'),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull()
});

// Activities table
export const activitiesTable = pgTable('activities', {
  id: serial('id').primaryKey(),
  daily_itinerary_id: integer('daily_itinerary_id').references(() => dailyItinerariesTable.id).notNull(),
  title: text('title').notNull(),
  description: text('description'),
  location_name: text('location_name').notNull(),
  latitude: real('latitude'),
  longitude: real('longitude'),
  start_time: text('start_time'), // Time format HH:MM
  end_time: text('end_time'),
  estimated_duration: integer('estimated_duration'), // Duration in minutes
  transportation_method: transportationMethodEnum('transportation_method'),
  cost_estimate: numeric('cost_estimate', { precision: 10, scale: 2 }),
  order_index: integer('order_index').notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull()
});

// Expenses table
export const expensesTable = pgTable('expenses', {
  id: serial('id').primaryKey(),
  trip_id: integer('trip_id').references(() => tripsTable.id).notNull(),
  payer_id: integer('payer_id').references(() => usersTable.id).notNull(),
  title: text('title').notNull(),
  description: text('description'),
  amount: numeric('amount', { precision: 10, scale: 2 }).notNull(),
  currency: text('currency').notNull(),
  category: expenseCategoryEnum('category').notNull(),
  expense_date: timestamp('expense_date').notNull(),
  created_at: timestamp('created_at').defaultNow().notNull()
});

// Expense splits table
export const expenseSplitsTable = pgTable('expense_splits', {
  id: serial('id').primaryKey(),
  expense_id: integer('expense_id').references(() => expensesTable.id).notNull(),
  user_id: integer('user_id').references(() => usersTable.id).notNull(),
  amount: numeric('amount', { precision: 10, scale: 2 }).notNull(),
  is_settled: boolean('is_settled').default(false).notNull()
});

// Location suggestions table
export const locationSuggestionsTable = pgTable('location_suggestions', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description'),
  latitude: real('latitude').notNull(),
  longitude: real('longitude').notNull(),
  category: locationCategoryEnum('category').notNull(),
  rating: real('rating'),
  price_level: integer('price_level'), // 1-4 scale
  area: text('area'),
  created_at: timestamp('created_at').defaultNow().notNull()
});

// Reminders table
export const remindersTable = pgTable('reminders', {
  id: serial('id').primaryKey(),
  user_id: integer('user_id').references(() => usersTable.id).notNull(),
  trip_id: integer('trip_id').references(() => tripsTable.id).notNull(),
  activity_id: integer('activity_id').references(() => activitiesTable.id),
  title: text('title').notNull(),
  message: text('message').notNull(),
  reminder_time: timestamp('reminder_time').notNull(),
  is_sent: boolean('is_sent').default(false).notNull(),
  created_at: timestamp('created_at').defaultNow().notNull()
});

// Relations
export const usersRelations = relations(usersTable, ({ many }) => ({
  trips: many(tripsTable),
  tripMembers: many(tripMembersTable),
  expenses: many(expensesTable),
  expenseSplits: many(expenseSplitsTable),
  reminders: many(remindersTable)
}));

export const tripsRelations = relations(tripsTable, ({ one, many }) => ({
  user: one(usersTable, {
    fields: [tripsTable.user_id],
    references: [usersTable.id]
  }),
  tripMembers: many(tripMembersTable),
  dailyItineraries: many(dailyItinerariesTable),
  expenses: many(expensesTable),
  reminders: many(remindersTable)
}));

export const tripMembersRelations = relations(tripMembersTable, ({ one }) => ({
  trip: one(tripsTable, {
    fields: [tripMembersTable.trip_id],
    references: [tripsTable.id]
  }),
  user: one(usersTable, {
    fields: [tripMembersTable.user_id],
    references: [usersTable.id]
  })
}));

export const dailyItinerariesRelations = relations(dailyItinerariesTable, ({ one, many }) => ({
  trip: one(tripsTable, {
    fields: [dailyItinerariesTable.trip_id],
    references: [tripsTable.id]
  }),
  activities: many(activitiesTable)
}));

export const activitiesRelations = relations(activitiesTable, ({ one, many }) => ({
  dailyItinerary: one(dailyItinerariesTable, {
    fields: [activitiesTable.daily_itinerary_id],
    references: [dailyItinerariesTable.id]
  }),
  reminders: many(remindersTable)
}));

export const expensesRelations = relations(expensesTable, ({ one, many }) => ({
  trip: one(tripsTable, {
    fields: [expensesTable.trip_id],
    references: [tripsTable.id]
  }),
  payer: one(usersTable, {
    fields: [expensesTable.payer_id],
    references: [usersTable.id]
  }),
  splits: many(expenseSplitsTable)
}));

export const expenseSplitsRelations = relations(expenseSplitsTable, ({ one }) => ({
  expense: one(expensesTable, {
    fields: [expenseSplitsTable.expense_id],
    references: [expensesTable.id]
  }),
  user: one(usersTable, {
    fields: [expenseSplitsTable.user_id],
    references: [usersTable.id]
  })
}));

export const remindersRelations = relations(remindersTable, ({ one }) => ({
  user: one(usersTable, {
    fields: [remindersTable.user_id],
    references: [usersTable.id]
  }),
  trip: one(tripsTable, {
    fields: [remindersTable.trip_id],
    references: [tripsTable.id]
  }),
  activity: one(activitiesTable, {
    fields: [remindersTable.activity_id],
    references: [activitiesTable.id]
  })
}));

// Export all tables for proper query building
export const tables = {
  users: usersTable,
  trips: tripsTable,
  tripMembers: tripMembersTable,
  dailyItineraries: dailyItinerariesTable,
  activities: activitiesTable,
  expenses: expensesTable,
  expenseSplits: expenseSplitsTable,
  locationSuggestions: locationSuggestionsTable,
  reminders: remindersTable
};
