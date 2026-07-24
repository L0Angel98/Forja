import { boolean, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { role } from "./role";

export const appUser = pgTable("app_user", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  nombre: text("nombre").notNull(),
  roleId: text("role_id")
    .notNull()
    .references(() => role.id),
  activo: boolean("activo").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
