/** Client-safe payload schema for public landing page form submissions. */
import { z } from "zod";

export const submitSchema = z.object({
  funnel: z.enum(["quote", "platform"]),
  slug: z.string().min(1).max(200),
  preview_token: z.string().max(100).optional().nullable(),
  session_id: z.string().min(6).max(100),
  submission_id: z.string().min(8).max(100),
  variant_key: z.string().max(20).optional().nullable(),
  version_id: z.string().uuid().optional().nullable(),
  /** Honeypot: must stay empty for real visitors. */
  hp: z.string().max(200).optional().nullable(),
  /** Milliseconds between form render and submit. */
  elapsed_ms: z.number().int().nonnegative().optional().nullable(),
  values: z.record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.array(z.string())])),
  attribution: z.record(z.string(), z.unknown()).optional().nullable(),
  is_test: z.boolean().optional(),
});

export type SubmitPayload = z.infer<typeof submitSchema>;
