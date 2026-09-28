import { z } from "zod";

export const consumeTypeSchema = z.enum(["parts", "percent", "amount"]);
export type ConsumeType = z.infer<typeof consumeTypeSchema>;
