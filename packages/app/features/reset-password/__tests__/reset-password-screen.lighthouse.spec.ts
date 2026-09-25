import { expect, test } from "~tests/frontend/fixtures";

test("Reset password screen Lighthouse audit", async ({
	page,
	api,
	runAudit,
	faker,
}) => {
	api.mockUtils.noAuthPage();
	api.mockFirst("resetPasswordIntentions.get", {
		email: faker.internet.email(),
	});
	const scores = await runAudit({
		to: "/reset-password",
	});
	await expect(page).toHaveTitle("RA - Reset password");
	expect(scores).toStrictEqual({
		accessibility: 0.93,
		"best-practices": 1,
		seo: 0.9,
		"agentic-browsing": 1,
	});
});
