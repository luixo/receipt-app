import { mergeTests } from "@playwright/test";
import { TRPCError } from "@trpc/server";
import assert from "node:assert";

import { test as peersSuggestFixture } from "~app/components/app/__tests__/peers-suggest.utils";
import { expect } from "~tests/frontend/fixtures";

import { test as localTest } from "./inbound-connection-intention.utils";

const test = mergeTests(localTest, peersSuggestFixture);

test("'userConnectionIntentions.reject' mutation", async ({
	page,
	api,
	mockConnectionIntentions,
	rejectButton,
	awaitCacheKey,
	verifyToastTexts,
	snapshotQueries,
}) => {
	const { inbound } = await mockConnectionIntentions({ inboundAmount: 1 });
	const [intention] = inbound;
	assert.ok(intention);
	await page.navigate({ to: "/peers/connections" });

	api.mockFirst("userConnectionIntentions.reject", () => {
		throw new TRPCError({
			code: "FORBIDDEN",
			message: `Mock "userConnectionIntentions.reject" error`,
		});
	});
	await snapshotQueries(
		async () => {
			await rejectButton.click();
			await awaitCacheKey("userConnectionIntentions.reject", { error: 1 });
			await verifyToastTexts(
				`Error rejecting invite: Mock "userConnectionIntentions.reject" error`,
			);
		},
		{ blacklistKeys: ["peers.suggestTop"] },
	);
	await expect(page.getByLabel("Email to connect")).toHaveValue(
		intention.user.email,
	);

	api.mockFirst("userConnectionIntentions.reject", undefined);
	await snapshotQueries(
		async () => {
			await rejectButton.click();
			await awaitCacheKey("userConnectionIntentions.reject", {
				success: 1,
			});
		},
		{ name: "success", blacklistKeys: ["peers.suggestTop"] },
	);
	await expect(page.getByLabel("Email to connect")).not.toBeAttached();
});

test("'userConnectionIntentions.accept' mutation", async ({
	page,
	api,
	mockConnectionIntentions,
	mockSuggestedPeers,
	confirmDialog,
	confirmYesButton,
	confirmNoButton,
	awaitCacheKey,
	verifyToastTexts,
	snapshotQueries,
	suggestInput,
	suggestOption,
}) => {
	const { inbound } = await mockConnectionIntentions({ inboundAmount: 1 });
	const [intention] = inbound;
	assert.ok(intention);
	// Two peers: the first is used for the cancel + error rounds, the
	// second for the final retry, since `peers.suggestTop` is only fetched
	// once and re-mocking it mid-test wouldn't be picked up by the cache.
	const [firstPeer, secondPeer] = mockSuggestedPeers(2);
	assert.ok(firstPeer);
	assert.ok(secondPeer);
	await page.navigate({ to: "/peers/connections" });

	const input = suggestInput("Please choose a peer below to accept intention");
	const firstOption = suggestOption(firstPeer.name);

	await input.click();
	await firstOption.click();
	await expect(confirmDialog).toContainText(
		`This will connect account "${intention.user.email}" with a peer "${firstPeer.name}"`,
	);

	await confirmNoButton.click();
	await expect(page.getByLabel("Email to connect")).toBeAttached();

	await input.click();
	await firstOption.click();
	api.mockFirst("userConnectionIntentions.accept", () => {
		throw new TRPCError({
			code: "FORBIDDEN",
			message: `Mock "userConnectionIntentions.accept" error`,
		});
	});
	await snapshotQueries(async () => {
		await confirmYesButton.click();
		await awaitCacheKey("userConnectionIntentions.accept", { error: 1 });
		await verifyToastTexts(
			`Error accepting invite: Mock "userConnectionIntentions.accept" error`,
		);
	});
	await expect(page.getByLabel("Email to connect")).toBeAttached();

	// Retry with the second candidate
	const retryOption = suggestOption(secondPeer.name);
	await input.click();
	await retryOption.click();
	await expect(confirmDialog).toContainText(
		`This will connect account "${intention.user.email}" with a peer "${secondPeer.name}"`,
	);
	api.mockFirst("userConnectionIntentions.accept", {
		id: intention.user.id,
		email: intention.user.email,
		avatarUrl: undefined,
	});
	await snapshotQueries(
		async () => {
			await confirmYesButton.click();
			await awaitCacheKey("userConnectionIntentions.accept", {
				success: 1,
			});
		},
		{ name: "success" },
	);
	await expect(page.getByLabel("Email to connect")).not.toBeAttached();
});
