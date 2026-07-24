import { jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { TIPOS_EVENTO_AUDITORIA } from "@forja/core";
import { appUser } from "./app-user";

export const auditLog = pgTable("audit_log", {
  id: uuid("id").primaryKey().defaultRandom(),
  tipo: text("tipo", { enum: [...TIPOS_EVENTO_AUDITORIA] }).notNull(),
  ip: text("ip").notNull(),
  email: text("email"),
  userId: uuid("user_id").references(() => appUser.id),
  ocurridoEn: timestamp("ocurrido_en", { withTimezone: true }).notNull(),
  detalle: jsonb("detalle"),
});
