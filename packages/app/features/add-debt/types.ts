import type { z } from "zod";

import type { Direction } from "app/components/app/sign-button-group";
import type { TRPCQueryOutput } from "app/trpc";
import type { userItemSchema } from "app/utils/validation";

export type Form = {
	amount: number;
	direction: Direction;
	currency: TRPCQueryOutput<"currency.getList">[number];
	user: z.infer<typeof userItemSchema>;
	note: string;
	timestamp: Date;
};
