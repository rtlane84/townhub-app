import {
  pgTable,
  text,
  serial,
  integer,
  timestamp,
} from "drizzle-orm/pg-core";
import { businessesTable } from "./businesses";

export const mediaAssetsTable = pgTable("media_assets", {
  id: serial("id").primaryKey(),
  /** Null for platform-wide assets (admin events, highlights, platform logo). */
  businessId: integer("business_id").references(() => businessesTable.id, {
    onDelete: "cascade",
  }),
  uploadedByUserId: text("uploaded_by_user_id").notNull(),
  storedFilename: text("stored_filename").notNull().unique(),
  originalFilename: text("original_filename").notNull(),
  mimeType: text("mime_type").notNull(),
  byteSize: integer("byte_size").notNull(),
  url: text("url").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type MediaAsset = typeof mediaAssetsTable.$inferSelect;
export type InsertMediaAsset = typeof mediaAssetsTable.$inferInsert;
