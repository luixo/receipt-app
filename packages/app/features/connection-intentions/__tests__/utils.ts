import type { UserConnectionIntentions } from "~app/trpc-types";
import { test as originalTest } from "~tests/frontend/fixtures";

type Fixtures = {
	mockConnectionIntentions: (options?: {
		inboundAmount?: number;
		outboundAmount?: number;
	}) => Promise<UserConnectionIntentions>;
};

export const test = originalTest.extend<Fixtures>({
	mockConnectionIntentions: ({ api, faker }, use) =>
		use(async ({ inboundAmount = 0, outboundAmount = 0 } = {}) => {
			await api.mockUtils.authPage();
			const intentions: UserConnectionIntentions = {
				inbound: Array.from({ length: inboundAmount }, () => ({
					user: {
						id: faker.string.uuid(),
						email: faker.internet.email(),
					},
				})),
				outbound: Array.from({ length: outboundAmount }, () => ({
					user: {
						id: faker.string.uuid(),
						email: faker.internet.email(),
					},
					peer: {
						id: faker.string.uuid(),
						name: faker.person.fullName(),
					},
				})),
			};
			api.mockFirst("userConnectionIntentions.getAll", intentions);
			api.mockFirst("peers.suggestTop", { items: [] });
			api.mockFirst("peers.getPaged", { cursor: 0, count: 0, items: [] });
			return intentions;
		}),
});
