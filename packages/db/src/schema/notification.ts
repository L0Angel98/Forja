import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { area } from "./area";

export const notification = pgTable("notification", {
  id: uuid("id").primaryKey().defaultRandom(),
  areaId: uuid("area_id")
    .notNull()
    .references(() => area.id),
  tipo: text("tipo").notNull(),
  referenciaId: uuid("referencia_id").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
