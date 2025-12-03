import { pgTable, text, timestamp, boolean } from "drizzle-orm/pg-core";
import {
	createInsertSchema,
	createSelectSchema,
	createUpdateSchema,
} from "drizzle-zod";

export const users = pgTable("users", {
	id: text("id").primaryKey(),
	name: text("name").notNull(),
	email: text("email").notNull().unique(),
	emailVerified: boolean("email_verified").default(false).notNull(),
	image: text("image"),
	createdAt: timestamp("created_at").defaultNow().notNull(),
	updatedAt: timestamp("updated_at")
		.defaultNow()
		.$onUpdate(() => /* @__PURE__ */ new Date())
		.notNull(),
});

const userInsertSchema = createInsertSchema(users);
const userSelectSchema = createSelectSchema(users);
const userUpdateSchema = createUpdateSchema(users);

export type CreateUser = typeof userInsertSchema;
export type User = typeof userSelectSchema;
export type UpdateUser = typeof userUpdateSchema;
