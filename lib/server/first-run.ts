import { z } from "zod";
import type { Same } from "./same-type";
import type { FirstRunInput } from "@/lib/first-run";

export const firstRunSchema = z.object({
  timezone: z.string().min(1).max(100),
  className: z.string().min(1).max(100),
  periodNumber: z.number().int().min(1).max(20),
  startTime: z.string(),
  endTime: z.string(),
  weekdays: z
    .array(z.enum(["monday", "tuesday", "wednesday", "thursday", "friday"]))
    .min(1)
    .max(5),
});

// Fails to compile if the schema and the client-side type drift apart.
true satisfies Same<z.infer<typeof firstRunSchema>, FirstRunInput>;
