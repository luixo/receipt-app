import type { TRPCQueryOutput } from "~app/trpc";
import { test as originalTest } from "~tests/frontend/fixtures";

type Intentions = TRPCQueryOutput<"accountConnectionIntentions.getAll">;

type Fixtures = {
	mockConnectionIntentions: (options?: {
		inboundAmount?: number;
		outboundAmount?: number;
	}) => Promise<Intentions>;
	openConnectionIntentions: () => Promise<void>;
};

export const test = originalTest.extend<Fixtures>({
	mockConnectionIntentions: ({ api, faker, page }, use) =>
		use(async ({ inboundAmount = 0, outboundAmount = 0 } = {}) => {
			await api.mockUtils.authPage({ page });
			const intentions: Intentions = {
				inbound: Array.from({ length: inboundAmount }, () => ({
					account: {
						id: faker.string.uuid(),
						email: faker.internet.email(),
					},
				})),
				outbound: Array.from({ length: outboundAmount }, () => ({
					account: {
						id: faker.string.uuid(),
						email: faker.internet.email(),
					},
					user: {
						id: faker.string.uuid(),
						name: faker.person.fullName(),
					},
				})),
			};
			api.mockFirst("accountConnectionIntentions.getAll", intentions);
			// `users.suggestTop` has no `enabled` gate in `UsersSuggest`, so it always
			// fires while an inbound row is rendered - mock it by default.
			api.mockFirst("users.suggestTop", { items: [] });
			return intentions;
		}),

	openConnectionIntentions: ({ page, awaitCacheKey }, use) =>
		use(async () => {
			await page.goto("/users/connections");
			await awaitCacheKey("accountConnectionIntentions.getAll");
		}),
});
