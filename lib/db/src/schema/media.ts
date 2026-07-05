import {
  pgTable,
  text,
  serial,
  integer,
  timestamp,
  index,
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
}, (table) => [
  // Media library list: WHERE business_id IS NULL | = ? ORDER BY created_at DESC
  index("media_assets_business_created_at_idx").on(table.businessId, table.createdAt),
]);

export type MediaAsset = typeof mediaAssetsTable.$inferSelect;
export type InsertMediaAsset = typeof mediaAssetsTable.$inferInsert;
