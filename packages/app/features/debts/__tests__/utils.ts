import { TRPCError } from "@trpc/server";
import { entries, flat, fromEntries, mapValues, values } from "remeda";

import type { Debt } from "~app/trpc-types";
import type { CurrencyCode } from "~app/utils/currency";
import type { PeerId } from "~db/ids";
import { test as originalTest } from "~tests/frontend/fixtures";
import type { GenerateDebts } from "~tests/frontend/generators/debts";
import { defaultGenerateDebts } from "~tests/frontend/generators/debts";
import type { GeneratePeers } from "~tests/frontend/generators/peers";
import { defaultGeneratePeers } from "~tests/frontend/generators/peers";
import type { GeneratorFnWithAmount } from "~tests/frontend/generators/utils";

type LocalGenerateDebts = GeneratorFnWithAmount<
	Debt,
	{ peerId: PeerId; peers: ReturnType<GeneratePeers> }
>;

type Fixtures = {
	mockBase: (options?: { generatePeers?: GeneratePeers }) => Promise<{
		peers: ReturnType<GeneratePeers>;
	}>;
	mockDebts: (options?: {
		generatePeers?: GeneratePeers;
		generateDebts?: LocalGenerateDebts;
	}) => Promise<{
		debts: ReturnType<LocalGenerateDebts>;
		peers: ReturnType<GeneratePeers>;
	}>;
	openPeerDebtsScreen: (
		peerId: PeerId,
		options?: { awaitCache?: boolean; awaitDebts?: number },
	) => Promise<void>;
};

const aggregateDebts = (
	debts: ReturnType<GenerateDebts>,
): { currencyCode: CurrencyCode; sum: number }[] =>
	entries(
		debts.reduce<Record<CurrencyCode, number>>(
			(acc, { currencyCode, amount }) => ({
				...acc,
				[currencyCode]: (acc[currencyCode] || 0) + amount,
			}),
			{},
		),
	).map(([currencyCode, sum]) => ({ currencyCode, sum }));

export const test = originalTest.extend<Fixtures>({
	mockBase: ({ api, faker }, use) =>
		use(async ({ generatePeers = defaultGeneratePeers } = {}) => {
			await api.mockUtils.authPage();
			const peers = generatePeers({ faker, amount: 3 });
			api.mockUtils.mockPeers(...peers);
			return { peers };
		}),
	mockDebts: ({ api, faker, mockBase }, use) =>
		use(
			async ({ generatePeers, generateDebts = defaultGenerateDebts } = {}) => {
				const { peers } = await mockBase({ generatePeers });
				const debtsByPeers = fromEntries(
					peers.map(
						(peer) =>
							[
								peer.id,
								generateDebts({ faker, peerId: peer.id, peers }),
							] as const,
					),
				);
				const aggregatedDebtsByPeers = mapValues(debtsByPeers, (debts) =>
					aggregateDebts(debts),
				);
				const allDebts = flat(values(debtsByPeers));
				const aggregatedDebts = aggregateDebts(allDebts);
				api.mockFirst("debts.getAll", { items: aggregatedDebts });
				api.mockFirst("debts.getAllPeer", ({ input: { peerId } }) => ({
					items: aggregatedDebtsByPeers[peerId] ?? [],
				}));
				api.mockFirst(
					"debts.getPeersPaged",
					({ input: { cursor, limit } }) => ({
						count: peers.length,
						cursor,
						items: peers.map((peer) => peer.id).slice(cursor, cursor + limit),
					}),
				);
				api.mockFirst(
					"debts.getByPeerPaged",
					({ input: { peerId, cursor, limit } }) => {
						const peerDebts = debtsByPeers[peerId] ?? [];
						return {
							count: peerDebts.length,
							cursor,
							items: peerDebts
								.map(({ id }) => id)
								.slice(cursor, cursor + limit),
						};
					},
				);
				api.mockFirst("debts.get", ({ input: { id: lookupId } }) => {
					const matchedDebt = allDebts.find((debt) => debt.id === lookupId);
					if (!matchedDebt) {
						throw new TRPCError({
							code: "NOT_FOUND",
							message: `Expected to have debt id "${lookupId}", but none found`,
						});
					}
					return matchedDebt;
				});
				return { debts: allDebts, peers };
			},
		),

	openPeerDebtsScreen: ({ page, awaitCacheKey }, use) =>
		use(async (peerId, { awaitCache = true, awaitDebts = 0 } = {}) => {
			await page.navigate({ to: "/debts/peer/$id", params: { id: peerId } });
			if (awaitCache) {
				await awaitCacheKey("peers.get");
				await awaitCacheKey("debts.getAllPeer");
				await awaitCacheKey("debts.getByPeerPaged");
			}
			if (awaitDebts) {
				await awaitCacheKey("debts.get", awaitDebts);
			}
		}),
});
