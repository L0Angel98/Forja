import { boolean, doublePrecision, integer, jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { appUser } from "./app-user";
import { plant } from "./plant";

export const agentTrace = pgTable("agent_trace", {
  id: uuid("id").primaryKey().defaultRandom(),
  plantId: uuid("plant_id")
    .notNull()
    .references(() => plant.id),
  userId: uuid("user_id").references(() => appUser.id),
  origen: text("origen").notNull(),
  herramientasInvocadas: jsonb("herramientas_invocadas").notNull().default([]),
  tokensEntrada: integer("tokens_entrada").notNull().default(0),
  tokensSalida: integer("tokens_salida").notNull().default(0),
  costoUsd: doublePrecision("costo_usd").notNull().default(0),
  latenciaMs: integer("latencia_ms").notNull().default(0),
  exitoso: boolean("exitoso").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
