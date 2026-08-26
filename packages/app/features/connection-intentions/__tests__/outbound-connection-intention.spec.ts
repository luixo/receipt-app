import { TRPCError } from "@trpc/server";
import assert from "node:assert";

import { expect } from "~tests/frontend/fixtures";

import { test } from "./outbound-connection-intention.utils";

test("'accountConnectionIntentions.remove' mutation", async ({
	page,
	api,
	mockConnectionIntentions,
	openConnectionIntentions,
	unlinkButton,
	awaitCacheKey,
	verifyToastTexts,
	snapshotQueries,
}) => {
	const { outbound } = await mockConnectionIntentions({ outboundAmount: 1 });
	const intention = outbound[0];
	assert(intention);
	await openConnectionIntentions();

	api.mockFirst("accountConnectionIntentions.remove", () => {
		throw new TRPCError({
			code: "FORBIDDEN",
			message: `Mock "accountConnectionIntentions.remove" error`,
		});
	});
	await snapshotQueries(async () => {
		await unlinkButton.click();
		await awaitCacheKey("accountConnectionIntentions.remove", { errored: 1 });
		await verifyToastTexts(
			`Error removing invite: Mock "accountConnectionIntentions.remove" error`,
		);
	});
	await expect(page.getByLabel(intention.user.name)).toHaveValue(
		intention.account.email,
	);

	api.mockFirst("accountConnectionIntentions.remove", undefined);
	await snapshotQueries(
		async () => {
			await unlinkButton.click();
			await awaitCacheKey("accountConnectionIntentions.remove", {
				succeed: 1,
			});
		},
		{ name: "success" },
	);
	await expect(page.getByLabel(intention.user.name)).not.toBeAttached();
});
