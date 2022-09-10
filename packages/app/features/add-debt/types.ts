import { z } from "zod";

import { Direction } from "app/components/app/sign-button-group";
import { TRPCQueryOutput } from "app/trpc";
import { userItemSchema } from "app/utils/validation";

export type Form = {
	amount: number;
	direction: Direction;
	currency: TRPCQueryOutput<"currency.getList">[number];
	user: z.infer<typeof userItemSchema>;
	note: string;
	timestamp: Date;
};
