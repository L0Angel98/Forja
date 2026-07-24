import { ESTADOS_EJECUCION_RUTINA } from "@forja/core";
import { doublePrecision, integer, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { plant } from "./plant";

export const routineExecution = pgTable("routine_execution", {
  id: uuid("id").primaryKey().defaultRandom(),
  rutinaNombre: text("rutina_nombre").notNull(),
  plantId: uuid("plant_id")
    .notNull()
    .references(() => plant.id),
  iniciadaEn: timestamp("iniciada_en", { withTimezone: true }).notNull(),
  finalizadaEn: timestamp("finalizada_en", { withTimezone: true }),
  estado: text("estado", { enum: ESTADOS_EJECUCION_RUTINA }).notNull(),
  tokensUsados: integer("tokens_usados").notNull().default(0),
  costoUsd: doublePrecision("costo_usd").notNull().default(0),
  salida: text("salida"),
  error: text("error"),
});
