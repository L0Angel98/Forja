import { pgTable, primaryKey, uuid } from "drizzle-orm/pg-core";
import { area } from "./area";
import { document } from "./document";

export const documentArea = pgTable(
  "document_area",
  {
    documentId: uuid("document_id")
      .notNull()
      .references(() => document.id),
    areaId: uuid("area_id")
      .notNull()
      .references(() => area.id),
  },
  (table) => [primaryKey({ columns: [table.documentId, table.areaId] })],
);
