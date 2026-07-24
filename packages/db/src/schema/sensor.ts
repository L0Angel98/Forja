import { doublePrecision, integer, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { machine } from "./machine";

export const MUDO_TRAS_MINUTOS_POR_DEFECTO = 60;

export const sensor = pgTable("sensor", {
  id: uuid("id").primaryKey().defaultRandom(),
  machineId: uuid("machine_id")
    .notNull()
    .references(() => machine.id),
  externalId: text("external_id").notNull().unique(),
  nombre: text("nombre").notNull(),
  unidad: text("unidad").notNull(),
  rangoMin: doublePrecision("rango_min").notNull(),
  rangoMax: doublePrecision("rango_max").notNull(),
  protocolo: text("protocolo", { enum: ["mqtt", "opcua"] })
    .notNull()
    .default("mqtt"),
  mudoTrasMinutos: integer("mudo_tras_minutos").notNull().default(MUDO_TRAS_MINUTOS_POR_DEFECTO),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
