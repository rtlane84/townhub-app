import { pgEnum, pgTable, serial, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { usersTable } from "./users";

export const accountDeletionStatusEnum = pgEnum("account_deletion_status", [
  "REQUESTED",
  "CANCELED",
  "COMPLETED",
]);

export const accountDeletionRequestsTable = pgTable(
  "account_deletion_requests",
  {
    id: serial("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "restrict" }),
    emailSnapshot: text("email_snapshot").notNull(),
    status: accountDeletionStatusEnum("status").notNull().default("REQUESTED"),
    requestedAt: timestamp("requested_at", { withTimezone: true }).notNull().defaultNow(),
    scheduledFor: timestamp("scheduled_for", { withTimezone: true }).notNull(),
    canceledAt: timestamp("canceled_at", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [uniqueIndex("account_deletion_requests_user_id_unique").on(table.userId)],
).enableRLS();

export type AccountDeletionRequest = typeof accountDeletionRequestsTable.$inferSelect;
