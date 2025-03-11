import { pgTable, text, serial, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Users table
export const users = pgTable("users", {
  id: text("id").primaryKey(), // Discord user ID
  username: text("username").notNull(),
  discriminator: text("discriminator").notNull(),
  avatar: text("avatar"),
  isAdmin: boolean("is_admin").default(false).notNull(),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  tokenExpiry: timestamp("token_expiry"),
});

// Offices table
export const offices = pgTable("offices", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  isPrivate: boolean("is_private").default(true).notNull(),
  ownerId: text("owner_id").notNull().references(() => users.id),
  status: text("status").default("active").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Office members
export const officeMembers = pgTable("office_members", {
  id: serial("id").primaryKey(),
  officeId: integer("office_id").notNull().references(() => offices.id),
  userId: text("user_id").notNull().references(() => users.id),
  isOwner: boolean("is_owner").default(false).notNull(),
  joinedAt: timestamp("joined_at").defaultNow().notNull(),
});

// Insert schemas
export const insertUserSchema = createInsertSchema(users);
export const insertOfficeSchema = createInsertSchema(offices).pick({
  name: true,
  description: true,
  isPrivate: true,
  ownerId: true,
});
export const insertOfficeMemberSchema = createInsertSchema(officeMembers).pick({
  officeId: true,
  userId: true,
  isOwner: true,
});

// Update schemas
export const updateOfficeSchema = createInsertSchema(offices).pick({
  name: true,
  description: true,
  isPrivate: true,
  status: true,
}).partial();

// Export types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Office = typeof offices.$inferSelect;
export type InsertOffice = z.infer<typeof insertOfficeSchema>;

export type OfficeMember = typeof officeMembers.$inferSelect;
export type InsertOfficeMember = z.infer<typeof insertOfficeMemberSchema>;
