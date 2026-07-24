import { ESTADOS_FALLA, SINTOMAS_TAXONOMIA } from "@forja/core";
import { integer, jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { appUser } from "./app-user";
import { machine } from "./machine";

export const failureReport = pgTable("failure_report", {
  id: uuid("id").primaryKey().defaultRandom(),
  machineId: uuid("machine_id")
    .notNull()
    .references(() => machine.id),
  reportadoPor: uuid("reportado_por")
    .notNull()
    .references(() => appUser.id),
  sintomaTaxonomia: text("sintoma_taxonomia", { enum: SINTOMAS_TAXONOMIA }),
  sintomaOtro: text("sintoma_otro"),
  descripcion: text("descripcion").notNull(),
  severidad: integer("severidad").notNull(),
  fotos: jsonb("fotos").notNull().default([]),
  origen: text("origen", { enum: ["agente", "formulario"] }).notNull(),
  estado: text("estado", { enum: ESTADOS_FALLA }).notNull().default("abierto"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
