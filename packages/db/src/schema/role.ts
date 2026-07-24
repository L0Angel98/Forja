import { pgTable, text } from "drizzle-orm/pg-core";

export const role = pgTable("role", {
  id: text("id").primaryKey(),
});

export const ROLES = ["operador", "supervisor", "admin"] as const;
export type RoleId = (typeof ROLES)[number];
