import { expect, test } from "#tests/frontend/fixtures.ts";

test("Admin wrapper renders the admin page and its navigation item", async ({
	page,
	api,
}) => {
	const { user, peer } = await api.mockUtils.authPage();
	api.mockFirst("user.get", {
		user: { ...user, role: "admin" },
		peer: { name: peer.name },
	});
	api.mockFirst("admin.users", { items: [] });
	await page.navigate({ to: "/debts" });
	await page.getByRole("link", { name: "Admin" }).click();
	await expect(
		page.getByRole("heading", { name: "Admin panel" }),
	).toBeVisible();
	await expect(page.getByRole("link", { name: "Admin" })).toBeVisible();
});
