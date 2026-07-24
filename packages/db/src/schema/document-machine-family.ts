import { pgTable, primaryKey, uuid } from "drizzle-orm/pg-core";
import { document } from "./document";
import { machineFamily } from "./machine-family";

export const documentMachineFamily = pgTable(
  "document_machine_family",
  {
    documentId: uuid("document_id")
      .notNull()
      .references(() => document.id),
    machineFamilyId: uuid("machine_family_id")
      .notNull()
      .references(() => machineFamily.id),
  },
  (table) => [primaryKey({ columns: [table.documentId, table.machineFamilyId] })],
);
