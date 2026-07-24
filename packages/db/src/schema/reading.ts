import { boolean, doublePrecision, pgTable, primaryKey, timestamp, uuid } from "drizzle-orm/pg-core";
import { sensor } from "./sensor";

export const reading = pgTable(
  "reading",
  {
    sensorId: uuid("sensor_id")
      .notNull()
      .references(() => sensor.id),
    ts: timestamp("ts", { withTimezone: true }).notNull(),
    value: doublePrecision("value").notNull(),
    fueraDeRango: boolean("fuera_de_rango").notNull().default(false),
  },
  (table) => [primaryKey({ columns: [table.sensorId, table.ts] })],
);
