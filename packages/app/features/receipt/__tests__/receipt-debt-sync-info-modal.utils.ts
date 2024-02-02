import type { ExtractFixture } from "@tests/frontend/fixtures";

import {
	generateDebtsWith,
	ourDesynced,
	ourNonExistent,
	ourSynced,
} from "./debts.generators";
import { test as originalTest } from "./debts.utils";
import {
	defaultGenerateReceiptItemsParts,
	defaultGenerateUsers,
} from "./generators";

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
				generateDebts: generateDebtsWith([
					ourNonExistent,
					ourDesynced,
					ourSynced,
				]),
			}),
		),
});
