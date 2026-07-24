import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

export const ESTADOS_SUGERENCIA_MEMORIA = ["pendiente", "aprobada", "rechazada"] as const;

export const memorySuggestion = pgTable("memory_suggestion", {
  id: uuid("id").primaryKey().defaultRandom(),
  contenido: text("contenido").notNull(),
  estado: text("estado", { enum: ESTADOS_SUGERENCIA_MEMORIA }).notNull().default("pendiente"),
  propuestaEn: timestamp("propuesta_en", { withTimezone: true }).notNull(),
});
