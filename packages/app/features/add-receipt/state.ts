import { z } from "zod";

import type { TRPCMutationInput } from "#app/trpc.ts";
import {
	currencyCodeSchema,
	receiptNameSchema,
} from "#app/utils/validation.ts";
import { temporalSchemas } from "#utils/temporal.ts";

export type { Item, Payer } from "#app/features/receipt-components/state.ts";

export const formSchema = z.object({
	name: receiptNameSchema,
	currencyCode: currencyCodeSchema,
	issued: temporalSchemas.plainDate,
});

export type Form = z.infer<typeof formSchema>;

export type Participant = NonNullable<
	TRPCMutationInput<"receipts.add">["participants"]
>[number] & { createdAt: Temporal.ZonedDateTime };
