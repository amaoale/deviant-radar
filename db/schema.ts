import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const investmentState = sqliteTable("investment_state", {
  id: text("id").primaryKey(),
  ciphertext: text("ciphertext").notNull(),
  iv: text("iv").notNull(),
  revision: integer("revision").notNull().default(1),
  updatedAt: text("updated_at").notNull(),
});
