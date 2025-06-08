import { z } from "zod/v4";

import type { TRPCMutationInput } from "~app/trpc";
import { currencyCodeSchema, receiptNameSchema } from "~app/utils/validation";

export type { Item, Payer } from "~app/features/receipt-components/state";

export const formSchema = z.object({
	name: receiptNameSchema,
	currencyCode: currencyCodeSchema,
	issued: z.date(),
});

export type Form = z.infer<typeof formSchema>;

export type Participant = NonNullable<
	TRPCMutationInput<"receipts.add">["participants"]
>[number] & { createdAt: Date };
