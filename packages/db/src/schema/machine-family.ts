import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

export const machineFamily = pgTable("machine_family", {
  id: uuid("id").primaryKey().defaultRandom(),
  nombre: text("nombre").notNull().unique(),
  descripcion: text("descripcion"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
