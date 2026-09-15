import { z } from "zod";

import type { TRPCMutationInput } from "~app/trpc";
import { currencyCodeSchema, receiptNameSchema } from "~app/utils/validation";
import { temporalSchemas } from "~utils/temporal";

export type { Item, Payer } from "~app/features/receipt-components/state";

export const formSchema = z.object({
	name: receiptNameSchema,
	currencyCode: currencyCodeSchema,
	issued: temporalSchemas.plainDate,
});

export type Form = z.infer<typeof formSchema>;

export type Participant = NonNullable<
	TRPCMutationInput<"receipts.add">["participants"]
>[number] & { createdAt: Temporal.ZonedDateTime };
