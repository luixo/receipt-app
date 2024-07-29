import type { Locator } from "@playwright/test";

import { test as originalTest } from "~tests/frontend/fixtures";
import type { KeysLists } from "~tests/frontend/fixtures/queries";
import { DEFAULT_BLACKLIST_KEYS } from "~tests/frontend/fixtures/queries";

import type {
	GenerateSelfAccount,
	GenerateTransferIntentions,
	GenerateUsers,
} from "./generators";
import {
	defaultGenerateSelfAccount,
	defaultGenerateTransferIntentions,
	defaultGenerateUsers,
} from "./generators";

type Fixtures = {
	acceptButton: Locator;
	rejectButton: Locator;
	removeButton: Locator;
	inboundIntention: Locator;
	outboundIntention: Locator;
	intentions: Locator;
	receiptSnippet: Locator;
	emptyCardTransfers: Locator;
	keysLists: KeysLists;
	mockBase: () => void;
	mockIntentions: (opts?: {
		generateSelfAccount?: GenerateSelfAccount;
		generateUsers?: GenerateUsers;
		generateTransferIntentions?: GenerateTransferIntentions;
	}) => void;
};

export const test = originalTest.extend<Fixtures>({
	acceptButton: ({ page }, use) =>
		use(page.locator("button[title='Accept receipt transfer']")),
	rejectButton: ({ page }, use) =>
		use(page.locator("button[title='Reject receipt transfer']")),
	removeButton: ({ page }, use) =>
		use(page.locator("button[title='Remove receipt transfer']")),
	inboundIntention: ({ page }, use) =>
		use(page.getByTestId("inbound-receipt-transfer-intention")),
	outboundIntention: ({ page }, use) =>
		use(page.getByTestId("outbound-receipt-transfer-intention")),
	receiptSnippet: ({ page }, use) => use(page.getByTestId("receipt-snippet")),
	intentions: ({ page }, use) =>
		use(page.getByTestId("receipt-transfer-intentions")),
	emptyCardTransfers: ({ emptyCard }, use) =>
		use(
			emptyCard("You have no incoming or outcoming receipt transfer requests"),
		),
	// eslint-disable-next-line no-empty-pattern
	keysLists: ({}, use) =>
		use({
			blacklistKeys: [...DEFAULT_BLACKLIST_KEYS, "users.get"],
			whitelistKeys: ["receiptTransferIntentions.getAll"],
		}),

	mockBase: ({ api }, use) => use(() => api.mockUtils.currencyList()),

	mockIntentions: ({ api, faker, mockBase }, use) =>
		use(
			({
				generateSelfAccount = defaultGenerateSelfAccount,
				generateUsers = defaultGenerateUsers,
				generateTransferIntentions = defaultGenerateTransferIntentions,
			} = {}) => {
				mockBase();
				const selfAccount = generateSelfAccount({ faker });
				const users = generateUsers({ faker });
				const transferIntentions = generateTransferIntentions({ faker, users });
				api.mockUtils.auth({
					account: {
						id: selfAccount.accountId,
						email: selfAccount.email,
						verified: true,
						avatarUrl: selfAccount.avatarUrl,
						role: undefined,
					},
					user: { name: selfAccount.name },
				});
				api.mock("users.get", (input) => {
					if (input.id === selfAccount.accountId) {
						return {
							id: selfAccount.userId,
							name: selfAccount.name,
							publicName: undefined,
							connectedAccount: {
								id: selfAccount.accountId,
								email: selfAccount.email,
								avatarUrl: selfAccount.avatarUrl,
							},
						};
					}
					const matchedUser = users.find((user) => user.id === input.id);
					if (matchedUser) {
						return {
							id: matchedUser.id,
							name: matchedUser.name,
							publicName: undefined,
							connectedAccount: matchedUser.connectedAccount
								? {
										id: matchedUser.connectedAccount.accountId,
										email: matchedUser.connectedAccount.email,
										avatarUrl: matchedUser.connectedAccount.avatarUrl,
								  }
								: undefined,
						};
					}

					throw new Error(`Unexpected user id in "users.get": ${input.id}`);
				});
				api.mock("receiptTransferIntentions.getAll", transferIntentions);
			},
		),
});
