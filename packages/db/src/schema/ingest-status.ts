import { integer, pgTable, text, timestamp } from "drizzle-orm/pg-core";

/** Fila singleton: apps/ingest no expone HTTP, así que persiste aquí el lag para que /api/salud lo lea. */
export const INGEST_STATUS_ID = "singleton";

export const ingestStatus = pgTable("ingest_status", {
  id: text("id").primaryKey().default(INGEST_STATUS_ID),
  lagMs: integer("lag_ms").notNull(),
  bufferSize: integer("buffer_size").notNull(),
  actualizadoEn: timestamp("actualizado_en", { withTimezone: true }).notNull(),
});
