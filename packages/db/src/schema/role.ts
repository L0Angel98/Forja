import { ROLES } from "@forja/core";
import { pgTable, text } from "drizzle-orm/pg-core";

export { ROLES };

export const role = pgTable("role", {
  id: text("id").primaryKey(),
});
