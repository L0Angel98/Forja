import { boolean, pgTable, timestamp, uuid } from "drizzle-orm/pg-core";
import { agentTrace } from "./agent-trace";

export const responseFeedback = pgTable("response_feedback", {
  id: uuid("id").primaryKey().defaultRandom(),
  traceId: uuid("trace_id")
    .notNull()
    .references(() => agentTrace.id),
  util: boolean("util").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
