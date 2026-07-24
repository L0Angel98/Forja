import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { plant } from "./plant";

export const area = pgTable("area", {
  id: uuid("id").primaryKey().defaultRandom(),
  plantId: uuid("plant_id")
    .notNull()
    .references(() => plant.id),
  nombre: text("nombre").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
