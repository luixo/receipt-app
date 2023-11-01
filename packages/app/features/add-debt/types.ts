import type { z } from "zod";

import type { Direction } from "app/components/app/sign-button-group";
import type { Currency } from "app/utils/currency";
import type { userItemSchema } from "app/utils/validation";

export type Form = {
	amount: number;
	direction: Direction;
	currency: Currency;
	user: z.infer<typeof userItemSchema>;
	note: string;
	timestamp: Date;
};
