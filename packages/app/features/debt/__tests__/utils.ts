import assert from "node:assert";

import type { DebtId } from "~db/ids";
import { test as originalTest } from "~tests/frontend/fixtures";
import type { GenerateDebts } from "~tests/frontend/generators/debts";
import { defaultGenerateDebts } from "~tests/frontend/generators/debts";
import type { GeneratePeers } from "~tests/frontend/generators/peers";
import { defaultGeneratePeers } from "~tests/frontend/generators/peers";

type Fixtures = {
	mockBase: () => Promise<{
		debtPeer: ReturnType<GeneratePeers>[number];
	}>;
	mockDebt: (options?: { generateDebts?: GenerateDebts }) => Promise<{
		debt: ReturnType<GenerateDebts>[number];
		debtPeer: ReturnType<GeneratePeers>[number];
	}>;
	openDebtScreen: (
		debtId: DebtId,
		options?: { awaitCache?: boolean },
	) => Promise<void>;
};

export const test = originalTest.extend<Fixtures>({
	mockBase: ({ api, faker }, use) =>
		use(async () => {
			const auth = await api.mockUtils.authPage();
			const [peer] = defaultGeneratePeers({ faker, amount: 1 });
			assert.ok(peer);
			api.mockUtils.mockPeers(peer);
			return { ...auth, debtPeer: peer };
		}),

	mockDebt: ({ api, faker, mockBase }, use) =>
		use(async ({ generateDebts = defaultGenerateDebts } = {}) => {
			const { debtPeer } = await mockBase();
			const [debt] = generateDebts({
				faker,
				amount: 1,
				peerId: debtPeer.id,
			});
			assert.ok(debt);
			api.mockFirst("debts.get", ({ input: { id: lookupId } }) => {
				if (lookupId !== debt.id) {
					throw new Error(`Unexpected debt id in "debts.get": ${lookupId}`);
				}
				return debt;
			});
			const aggregatedDebts = [
				{
					currencyCode: debt.currencyCode,
					sum: debt.amount,
				},
			];
			api.mockFirst("debts.getAll", {
				items: aggregatedDebts,
			});
			api.mockFirst("debts.getPeersPaged", ({ input: { cursor } }) => ({
				count: 1,
				cursor,
				items: [debtPeer.id],
			}));
			api.mockFirst(
				"debts.getAllPeer",
				({ input: { peerId: lookupPeerId } }) => {
					if (lookupPeerId !== debtPeer.id) {
						throw new Error(
							`Unexpected debt id in "debts.getAllPeer": ${lookupPeerId}`,
						);
					}
					return {
						items: aggregatedDebts,
					};
				},
			);
			api.mockFirst("debts.getByPeerPaged", () => ({
				cursor: 0,
				count: 1,
				items: [debt.id],
			}));
			api.mockFirst("debts.update", () => ({
				updatedAt: Temporal.Now.zonedDateTimeISO(),
				reverseUpdated: false,
			}));
			return { debt, debtPeer };
		}),

	openDebtScreen: ({ page, awaitCacheKey }, use) =>
		use(async (debtId, { awaitCache = true } = {}) => {
			await page.navigate({ to: "/debts/$id", params: { id: debtId } });
			if (awaitCache) {
				await awaitCacheKey("debts.get");
				await awaitCacheKey("peers.get");
			}
		}),
});
