import { TRPCError } from "@trpc/server";

import type { AccountsId, UsersId } from "~db/models";
import { test as originalTest } from "~tests/frontend/fixtures";
import type { GenerateDebts } from "~tests/frontend/generators/debts";
import { defaultGenerateDebts } from "~tests/frontend/generators/debts";
import {
	type GenerateUsers,
	defaultGenerateUsers,
} from "~tests/frontend/generators/users";

type Fixtures = {
	mockBase: () => {
		user: ReturnType<GenerateUsers>[number];
	};
	mockDebts: (options: {
		targetUserId: UsersId;
		generateDebts?: GenerateDebts;
	}) => {
		debts: ReturnType<GenerateDebts>;
	};
	openDebtIntentions: () => Promise<void>;
};

export const test = originalTest.extend<Fixtures>({
	mockBase: ({ api, faker }, use) =>
		use(() => {
			api.mockUtils.authPage();
			api.mockUtils.currencyList();
			const [self, other] = defaultGenerateUsers({ faker, amount: 2 });
			/* eslint-disable @typescript-eslint/no-non-null-assertion */
			const sureSelf = self!;
			const sureOther = other!;
			/* eslint-enable @typescript-eslint/no-non-null-assertion */
			api.mock("users.get", ({ input }) => {
				const match = [sureSelf, sureOther].find(({ id }) => id === input.id);
				if (!match) {
					throw new TRPCError({
						code: "NOT_FOUND",
						message: `User id "${input.id}" not found.`,
					});
				}
				return match;
			});
			api.mock("account.get", {
				account: {
					id: sureSelf.connectedAccount?.id ?? (sureSelf.id as AccountsId),
					email: faker.internet.email(),
					verified: true,
					avatarUrl: undefined,
					role: undefined,
				},
				user: { name: sureSelf.name },
			});
			const debts = defaultGenerateDebts({
				faker,
				amount: { min: 3, max: 6 },
				userId: sureOther.id,
			});
			api.mock(
				"debtIntentions.getAll",
				debts.map((debt) => ({
					id: debt.id,
					userId: debt.userId,
					currencyCode: debt.currencyCode,
					amount: debt.amount,
					timestamp: debt.timestamp,
					updatedAt: debt.updatedAt,
					note: debt.note,
				})),
			);
			return { user: sureSelf };
		}),

	mockDebts: ({ api, faker }, use) =>
		use(({ targetUserId, generateDebts = defaultGenerateDebts }) => {
			const debts = generateDebts({
				faker,
				amount: { min: 3, max: 6 },
				userId: targetUserId,
			});
			api.mock(
				"debtIntentions.getAll",
				debts.map((debt) => ({
					id: debt.id,
					userId: debt.userId,
					currencyCode: debt.currencyCode,
					amount: debt.amount,
					timestamp: debt.timestamp,
					updatedAt: debt.updatedAt,
					note: debt.note,
				})),
			);
			return { debts };
		}),

	openDebtIntentions: ({ page, awaitCacheKey }, use) =>
		use(async () => {
			await page.goto(`/debts/intentions`);
			await awaitCacheKey("debtIntentions.getAll");
		}),
});
