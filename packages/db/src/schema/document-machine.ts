import { pgTable, primaryKey, uuid } from "drizzle-orm/pg-core";
import { document } from "./document";
import { machine } from "./machine";

export const documentMachine = pgTable(
  "document_machine",
  {
    documentId: uuid("document_id")
      .notNull()
      .references(() => document.id),
    machineId: uuid("machine_id")
      .notNull()
      .references(() => machine.id),
  },
  (table) => [primaryKey({ columns: [table.documentId, table.machineId] })],
);
