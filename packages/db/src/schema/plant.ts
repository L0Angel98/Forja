import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

export const plant = pgTable("plant", {
  id: uuid("id").primaryKey().defaultRandom(),
  nombre: text("nombre").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
