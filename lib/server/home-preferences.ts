import { z } from "zod";
import type { Same } from "./same-type";
import type { HomeClassPreferences } from "@/lib/home-preferences";

export const homeClassesInput = z.object({
  order: z
    .array(z.uuid())
    .max(20)
    .refine((order) => new Set(order).size === order.length),
});

// Fails to compile if the schema and the client-side type drift apart.
true satisfies Same<z.infer<typeof homeClassesInput>, HomeClassPreferences>;
