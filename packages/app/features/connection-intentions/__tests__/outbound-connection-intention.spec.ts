import { TRPCError } from "@trpc/server";
import assert from "node:assert";

import { expect } from "~tests/frontend/fixtures";

import { test } from "./outbound-connection-intention.utils";

test("'userConnectionIntentions.remove' mutation", async ({
	page,
	api,
	mockConnectionIntentions,
	unlinkButton,
	awaitCacheKey,
	verifyToastTexts,
	snapshotQueries,
}) => {
	const { outbound } = await mockConnectionIntentions({ outboundAmount: 1 });
	const [intention] = outbound;
	assert.ok(intention);
	await page.navigate({ to: "/peers/connections" });

	api.mockFirst("userConnectionIntentions.remove", () => {
		throw new TRPCError({
			code: "FORBIDDEN",
			message: `Mock "userConnectionIntentions.remove" error`,
		});
	});
	await snapshotQueries(async () => {
		await unlinkButton.click();
		await awaitCacheKey("userConnectionIntentions.remove", { error: 1 });
		await verifyToastTexts(
			`Error removing invite: Mock "userConnectionIntentions.remove" error`,
		);
	});
	await expect(page.getByLabel(intention.peer.name)).toHaveValue(
		intention.user.email,
	);

	api.mockFirst("userConnectionIntentions.remove", undefined);
	await snapshotQueries(
		async () => {
			await unlinkButton.click();
			await awaitCacheKey("userConnectionIntentions.remove", {
				success: 1,
			});
		},
		{ name: "success" },
	);
	await expect(page.getByLabel(intention.peer.name)).not.toBeAttached();
});
