import { expect, test } from "@mobilewright/test";
import assert from "node:assert";

// Guest smoke: no backend needed. The app boots unauthenticated,
// index redirects to /login, and everything asserted here renders locally.
// Generous timeouts: a single-core emulator answers every UiAutomator
// round-trip in 10-20 s; on proper CI hardware this finishes in seconds.
test.setTimeout(600_000);
test.use({ bundleId: "me.luixo.receipt" });

test("guest sees login and can open reset-password", async ({
	device,
	screen,
	bundleId,
}) => {
	assert.ok(bundleId);
	await device.terminateApp(bundleId).catch(() => undefined);
	await device.launchApp(bundleId);

	// Cold start on a slow emulator takes a while; wait for first paint
	await screen.getByText("Login").first().waitFor({ timeout: 180_000 });

	// Input labels render as plain text, the fields themselves carry no id
	await expect(screen.getByText("Email")).toBeVisible();
	await expect(screen.getByText("Password")).toBeVisible();
	await expect(screen.getByText("Forgot password?")).toBeVisible();
	await screen.screenshot();

	// Local-only input, no network involved (first field is the email one)
	await screen.getByRole("textfield").first().fill("smoke@example.com");
	// Dismiss the keyboard so the tree is stable for what follows
	await screen.pressButton("BACK");

	await screen.getByText("Forgot password?").tap({ timeout: 120_000 });
	// The native sheet opens without triggering the previous update-depth crash.
	await screen.screenshot();
});
