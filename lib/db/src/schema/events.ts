import {
  pgTable,
  text,
  serial,
  boolean,
  timestamp,
  pgEnum,
  integer,
} from "drizzle-orm/pg-core";

export const eventTypeEnum = pgEnum("event_type", [
  "COMMUNITY",
  "FOOD_TRUCK",
  "SEASONAL",
  "SALE",
  "HOLIDAY",
  "MARKET",
  "OTHER",
]);

export const eventsTable = pgTable("events", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  date: text("date").notNull(),
  endDate: text("end_date"),
  startTime: text("start_time"),
  endTime: text("end_time"),
  location: text("location"),
  description: text("description"),
  imageUrl: text("image_url"),
  relatedBusinessId: integer("related_business_id"),
  eventType: eventTypeEnum("event_type").notNull().default("COMMUNITY"),
  featured: boolean("featured").notNull().default(false),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export type Event = typeof eventsTable.$inferSelect;
