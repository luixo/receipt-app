import type { TRPCQueryOutput } from "~app/trpc";

import type { GenerateUsers } from "./users";
import type { GeneratorFnWithFaker } from "./utils";
import { generateCurrencyCode } from "./utils";

export type GenerateTransferIntentions = GeneratorFnWithFaker<
	TRPCQueryOutput<"receiptTransferIntentions.getAll">,
	{
		users: ReturnType<GenerateUsers>;
		inboundAmount?: number;
		outboundAmount?: number;
	}
>;

const generateReceiptBase: GeneratorFnWithFaker<
	TRPCQueryOutput<"receiptTransferIntentions.getAll">["inbound"][number]["receipt"]
> = ({ faker }) => ({
	id: faker.string.uuid(),
	name: faker.commerce.product(),
	issued: new Date(),
	sum: Number(faker.finance.amount()),
	currencyCode: generateCurrencyCode(faker),
});

export const defaultGenerateTransferIntentions: GenerateTransferIntentions = ({
	faker,
	users,
	inboundAmount = 0,
	outboundAmount = 0,
}) => ({
	inbound: new Array(inboundAmount).fill(null).map((_, index) => ({
		receipt: generateReceiptBase({ faker }),
		// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
		userId: users[index % users.length]!.id,
	})),
	outbound: new Array(outboundAmount).fill(null).map((_, index) => ({
		receipt: generateReceiptBase({ faker }),
		// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
		userId: users[index % users.length]!.id,
	})),
});
