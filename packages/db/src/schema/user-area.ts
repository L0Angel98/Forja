import { pgTable, primaryKey, uuid } from "drizzle-orm/pg-core";
import { appUser } from "./app-user";
import { area } from "./area";

export const userArea = pgTable(
  "user_area",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => appUser.id),
    areaId: uuid("area_id")
      .notNull()
      .references(() => area.id),
  },
  (table) => [primaryKey({ columns: [table.userId, table.areaId] })],
);
