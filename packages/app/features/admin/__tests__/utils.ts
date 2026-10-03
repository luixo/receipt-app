import type { Locator } from "@playwright/test";

import type { TRPCQueryOutput } from "~app/trpc";
import { test as base } from "~tests/frontend/fixtures";
import type { ExtractFixture } from "~tests/frontend/types";

type Auth = Awaited<
	ReturnType<ExtractFixture<typeof base>["api"]["mockUtils"]["authPage"]>
>;

type Candidates = TRPCQueryOutput<"admin.users">["items"];

type Fixtures = {
	adminCards: Locator;
	adminCardGroup: Locator;
	mockAdmin: () => Promise<Auth & { candidates: Candidates }>;
};

export const test = base.extend<Fixtures>({
	adminCards: ({ page }, use) =>
		use(page.getByTestId("peer").locator("xpath=../..")),
	adminCardGroup: ({ adminCards }, use) =>
		use(adminCards.first().locator("xpath=..")),
	mockAdmin: ({ api, faker }, use) =>
		use(async () => {
			const auth = await api.mockUtils.authPage();
			api.mockFirst("user.get", {
				user: { ...auth.user, role: "admin" },
				peer: { name: auth.peer.name },
			});
			const candidates: Candidates = [
				{
					user: {
						id: faker.string.uuid(),
						email: faker.internet.email(),
						avatarUrl: undefined,
					},
					peer: {
						id: faker.string.uuid(),
						name: faker.person.fullName(),
					},
				},
				{
					user: {
						id: faker.string.uuid(),
						email: faker.internet.email(),
						avatarUrl: undefined,
					},
					peer: undefined,
				},
			];
			api.mockFirst("admin.users", { items: candidates });
			return { ...auth, candidates };
		}),
});
