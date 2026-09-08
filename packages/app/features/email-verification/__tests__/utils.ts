import type { Locator } from "@playwright/test";

import { test as originalTest } from "~tests/frontend/fixtures";
import type { ExtractFixture } from "~tests/frontend/types";

type AuthPageResult = Awaited<
	ReturnType<
		ExtractFixture<typeof originalTest>["api"]["mockUtils"]["authPage"]
	>
>;

type Fixtures = {
	mockUnverified: () => Promise<AuthPageResult>;
	emailVerificationCard: Locator;
	resendButton: Locator;
};

export const test = originalTest.extend<Fixtures>({
	mockUnverified: ({ api, page }, use) =>
		use(async () => {
			const auth = await api.mockUtils.authPage({ page });
			const unverifiedAccount = { ...auth.account, verified: false };
			api.mockFirst("account.get", {
				account: unverifiedAccount,
				user: { name: auth.user.name },
			});
			return { user: auth.user, account: unverifiedAccount };
		}),

	emailVerificationCard: ({ page }, use) =>
		use(page.getByTestId("email-verification-card")),

	resendButton: ({ page }, use) =>
		use(page.getByRole("button", { name: "Resend email" })),
});
