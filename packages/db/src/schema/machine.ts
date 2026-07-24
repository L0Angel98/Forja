import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { area } from "./area";
import { machineFamily } from "./machine-family";

export const machine = pgTable("machine", {
  id: uuid("id").primaryKey().defaultRandom(),
  areaId: uuid("area_id")
    .notNull()
    .references(() => area.id),
  machineFamilyId: uuid("machine_family_id").references(() => machineFamily.id),
  nombre: text("nombre").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
