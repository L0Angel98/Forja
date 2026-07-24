import { integer, pgTable, primaryKey, text, timestamp } from "drizzle-orm/pg-core";

export const loginAttempt = pgTable(
  "login_attempt",
  {
    ip: text("ip").notNull(),
    email: text("email").notNull(),
    intentosConsecutivos: integer("intentos_consecutivos").notNull(),
    bloqueadoHasta: timestamp("bloqueado_hasta", { withTimezone: true }),
    vecesBloqueado: integer("veces_bloqueado").notNull().default(0),
    ultimoIntentoEn: timestamp("ultimo_intento_en", { withTimezone: true }).notNull(),
  },
  (table) => [primaryKey({ columns: [table.ip, table.email] })],
);
