import { boolean, integer, pgTable, text, uuid } from "drizzle-orm/pg-core";
import { vector } from "drizzle-orm/pg-core";
import { document } from "./document";

/**
 * Dimensión fija por instalación (spec 14: "dimensión fija por instalación,
 * migración documentada si cambia"). 1536 corresponde a los modelos de
 * embeddings más comunes (p. ej. OpenAI text-embedding-3-small). Cambiarla
 * requiere una migración que recree esta columna y reindexe todos los
 * documentos.
 */
export const DIMENSION_EMBEDDING = 1536;

export const documentChunk = pgTable("document_chunk", {
  id: uuid("id").primaryKey().defaultRandom(),
  documentId: uuid("document_id")
    .notNull()
    .references(() => document.id),
  indice: integer("indice").notNull(),
  contenido: text("contenido").notNull(),
  seccion: text("seccion"),
  pagina: integer("pagina"),
  embedding: vector("embedding", { dimensions: DIMENSION_EMBEDDING }).notNull(),
  vigente: boolean("vigente").notNull().default(true),
});
