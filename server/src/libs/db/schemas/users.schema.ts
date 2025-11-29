import { pgTable, text, timestamp } from "drizzle-orm/pg-core";
import {
	createInsertSchema,
	createSelectSchema,
	createUpdateSchema,
} from "drizzle-zod";

export const users = pgTable("users", {
	id: text("id").primaryKey().notNull(),
	email: text("email").notNull().unique(),
	name: text("name"),
	image: text("image"),
	createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
	updatedAt: timestamp("updated_at", { mode: "date" }).notNull().defaultNow(),
});

const userInsertSchema = createInsertSchema(users);
const userSelectSchema = createSelectSchema(users);
const userUpdateSchema = createUpdateSchema(users);

export type CreateUser = typeof userInsertSchema;
export type User = typeof userSelectSchema;
export type UpdateUser = typeof userUpdateSchema;
