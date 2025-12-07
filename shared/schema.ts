import { sql } from "drizzle-orm";
import { pgTable, text, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// Domain models for PinkHope

export const patientSchema = z.object({
  id: z.string(),
  name: z.string(),
  age: z.number().int().nonnegative(),
  status: z.enum(["استشارة", "متابعة", "علاج"]).default("متابعة"),
  nextAppointment: z.string().optional(),
  riskLevel: z.enum(["منخفض", "متوسط", "مرتفع"]).default("منخفض"),
});
export type Patient = z.infer<typeof patientSchema>;

export const diaryEntrySchema = z.object({
  id: z.string(),
  patientId: z.string(),
  date: z.string(),
  content: z.string().min(1),
  mood: z.enum(["happy", "neutral", "sad"]).default("neutral"),
  sentimentScore: z.number().min(-1).max(1).default(0),
});
export type DiaryEntry = z.infer<typeof diaryEntrySchema>;

export const riskAssessmentInputSchema = z.object({
  patientId: z.string(),
  answers: z.record(z.string(), z.string()),
});
export type RiskAssessmentInput = z.infer<typeof riskAssessmentInputSchema>;

export const riskAssessmentResultSchema = z.object({
  id: z.string(),
  patientId: z.string(),
  score: z.number().min(0),
  level: z.enum(["منخفض", "متوسط", "مرتفع"]),
  recommendations: z.array(z.string()),
  createdAt: z.string(),
});
export type RiskAssessmentResult = z.infer<typeof riskAssessmentResultSchema>;

// Care alerts generated from diary sentiment or system signals
export const alertSchema = z.object({
  id: z.string(),
  patientId: z.string(),
  type: z.enum(["sentiment", "risk", "appointment"]),
  message: z.string(),
  createdAt: z.string(),
  status: z.enum(["open", "resolved"]).default("open"),
});
export type CareAlert = z.infer<typeof alertSchema>;
