import { doublePrecision, pgTable, timestamp, uuid } from "drizzle-orm/pg-core";
import { failureReport } from "./failure-report";
import { sensor } from "./sensor";

export const failureSensorSnapshot = pgTable("failure_sensor_snapshot", {
  id: uuid("id").primaryKey().defaultRandom(),
  failureReportId: uuid("failure_report_id")
    .notNull()
    .references(() => failureReport.id),
  sensorId: uuid("sensor_id")
    .notNull()
    .references(() => sensor.id),
  ventanaInicio: timestamp("ventana_inicio", { withTimezone: true }).notNull(),
  ventanaFin: timestamp("ventana_fin", { withTimezone: true }).notNull(),
  min: doublePrecision("min"),
  max: doublePrecision("max"),
  avg: doublePrecision("avg"),
  last: doublePrecision("last"),
});
