import { ESTADOS_INDEXACION, TIPOS_ARCHIVO_DOCUMENTO } from "@forja/core";
import { boolean, integer, type AnyPgColumn, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { appUser } from "./app-user";

export const document = pgTable("document", {
  id: uuid("id").primaryKey().defaultRandom(),
  nombre: text("nombre").notNull(),
  tipoArchivo: text("tipo_archivo", { enum: TIPOS_ARCHIVO_DOCUMENTO }).notNull(),
  rutaAlmacenada: text("ruta_almacenada").notNull(),
  tamanoBytes: integer("tamano_bytes").notNull(),
  version: integer("version").notNull().default(1),
  documentoAnteriorId: uuid("documento_anterior_id").references((): AnyPgColumn => document.id),
  vigente: boolean("vigente").notNull().default(true),
  estadoIndexacion: text("estado_indexacion", { enum: ESTADOS_INDEXACION }).notNull().default("pendiente"),
  subidoPor: uuid("subido_por")
    .notNull()
    .references(() => appUser.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
