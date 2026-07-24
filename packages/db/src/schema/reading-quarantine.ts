import { MOTIVOS_CUARENTENA } from "@forja/core";
import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

export const readingQuarantine = pgTable("reading_quarantine", {
  id: uuid("id").primaryKey().defaultRandom(),
  sensorExternalId: text("sensor_external_id").notNull(),
  payloadCrudo: text("payload_crudo").notNull(),
  motivo: text("motivo", { enum: MOTIVOS_CUARENTENA }).notNull(),
  ts: timestamp("ts", { withTimezone: true }),
  recibidoEn: timestamp("recibido_en", { withTimezone: true }).notNull().defaultNow(),
});
