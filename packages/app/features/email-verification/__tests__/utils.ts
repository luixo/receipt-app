import type { Locator } from "@playwright/test";

import { test as originalTest } from "~tests/frontend/fixtures";
import type { ExtractFixture } from "~tests/frontend/types";

type AuthPageResult = Awaited<
	ReturnType<
		ExtractFixture<typeof originalTest>["api"]["mockUtils"]["authPage"]
	>
>;

type Fixtures = {
	mockBase: () => Promise<AuthPageResult>;
	emailVerificationCard: Locator;
	resendButton: Locator;
};

export const test = originalTest.extend<Fixtures>({
	mockBase: ({ api }, use) =>
		use(async () => {
			const auth = await api.mockUtils.authPage();
			const unverifiedUser = { ...auth.user, verified: false };
			api.mockFirst("user.get", {
				user: unverifiedUser,
				peer: { name: auth.peer.name },
			});
			return { peer: auth.peer, user: unverifiedUser };
		}),

	emailVerificationCard: ({ page }, use) =>
		use(page.getByTestId("email-verification-card")),

	resendButton: ({ page }, use) =>
		use(page.getByRole("button", { name: "Resend email" })),
});
