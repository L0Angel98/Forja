import { boolean, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { appUser } from "./app-user";

export const session = pgTable("session", {
  id: text("id").primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => appUser.id),
  dispositivoCompartido: boolean("dispositivo_compartido").notNull().default(false),
  creadaEn: timestamp("creada_en", { withTimezone: true }).notNull().defaultNow(),
  ultimaActividadEn: timestamp("ultima_actividad_en", { withTimezone: true }).notNull().defaultNow(),
});
