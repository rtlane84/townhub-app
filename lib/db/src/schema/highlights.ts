import {
  pgTable,
  text,
  serial,
  boolean,
  timestamp,
  integer,
} from "drizzle-orm/pg-core";

export const highlightsTable = pgTable("highlights", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  imageUrl: text("image_url"),
  startDate: text("start_date").notNull(),
  endDate: text("end_date").notNull(),
  relatedBusinessId: integer("related_business_id"),
  buttonText: text("button_text"),
  buttonUrl: text("button_url"),
  active: boolean("active").notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
}).enableRLS();

export type Highlight = typeof highlightsTable.$inferSelect;
