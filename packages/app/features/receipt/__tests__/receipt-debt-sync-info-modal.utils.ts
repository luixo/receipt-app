import {
	defaultGenerateReceiptItemsParts,
	generateDebtsMapped,
	ourDesynced,
	ourNonExistent,
	ourSynced,
} from "~tests/frontend/generators/receipts";
import { defaultGenerateUsers } from "~tests/frontend/generators/users";
import type { ExtractFixture } from "~tests/frontend/types";

import { test as originalTest } from "./debts.utils";

type Fixture = {
	mockReceiptWithDebtsForModal: () => ReturnType<
		ExtractFixture<typeof originalTest>["mockReceiptWithDebts"]
	>;
};

export const test = originalTest.extend<Fixture>({
	mockReceiptWithDebtsForModal: ({ mockReceiptWithDebts }, use) =>
		use(() =>
			mockReceiptWithDebts({
				generateUsers: (opts) => defaultGenerateUsers({ ...opts, amount: 10 }),
				generateReceiptItemsParts: (opts) =>
					// Creating a 0 sum participant
					defaultGenerateReceiptItemsParts({
						...opts,
						participants: opts.participants.slice(1),
					}),
				generateDebts: generateDebtsMapped([
					ourNonExistent,
					ourDesynced,
					ourSynced,
				]),
			}),
		),
});
