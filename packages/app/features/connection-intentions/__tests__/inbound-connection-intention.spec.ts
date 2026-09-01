import { mergeTests } from "@playwright/test";
import { TRPCError } from "@trpc/server";
import assert from "node:assert";

import { test as usersSuggestFixture } from "~app/components/app/__tests__/users-suggest.utils";
import { expect } from "~tests/frontend/fixtures";

import { test as localTest } from "./inbound-connection-intention.utils";

const test = mergeTests(localTest, usersSuggestFixture);

test("'accountConnectionIntentions.reject' mutation", async ({
	page,
	api,
	mockConnectionIntentions,
	openConnectionIntentions,
	rejectButton,
	awaitCacheKey,
	verifyToastTexts,
	snapshotQueries,
}) => {
	const { inbound } = await mockConnectionIntentions({ inboundAmount: 1 });
	const [intention] = inbound;
	assert.ok(intention);
	await openConnectionIntentions();

	api.mockFirst("accountConnectionIntentions.reject", () => {
		throw new TRPCError({
			code: "FORBIDDEN",
			message: `Mock "accountConnectionIntentions.reject" error`,
		});
	});
	await snapshotQueries(async () => {
		await rejectButton.click();
		await awaitCacheKey("accountConnectionIntentions.reject", { errored: 1 });
		await verifyToastTexts(
			`Error rejecting invite: Mock "accountConnectionIntentions.reject" error`,
		);
	});
	await expect(page.getByLabel("Email to connect")).toHaveValue(
		intention.account.email,
	);

	api.mockFirst("accountConnectionIntentions.reject", undefined);
	await snapshotQueries(
		async () => {
			await rejectButton.click();
			await awaitCacheKey("accountConnectionIntentions.reject", {
				succeed: 1,
			});
		},
		{ name: "success" },
	);
	await expect(page.getByLabel("Email to connect")).not.toBeAttached();
});

test("'accountConnectionIntentions.accept' mutation", async ({
	page,
	api,
	mockConnectionIntentions,
	openConnectionIntentions,
	mockSuggestedUsers,
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
	// Two users: the first is used for the cancel + error rounds, the
	// second for the final retry, since `users.suggestTop` is only fetched
	// once and re-mocking it mid-test wouldn't be picked up by the cache.
	const [firstUser, secondUser] = mockSuggestedUsers(2);
	assert.ok(firstUser);
	assert.ok(secondUser);
	await openConnectionIntentions();

	const input = suggestInput("Please choose a user below to accept intention");
	const firstOption = suggestOption(firstUser.name);

	await input.click();
	await firstOption.click();
	await expect(confirmDialog).toContainText(
		`This will connect account "${intention.account.email}" with a user "${firstUser.name}"`,
	);

	await confirmNoButton.click();
	await expect(page.getByLabel("Email to connect")).toBeAttached();

	await input.click();
	await firstOption.click();
	api.mockFirst("accountConnectionIntentions.accept", () => {
		throw new TRPCError({
			code: "FORBIDDEN",
			message: `Mock "accountConnectionIntentions.accept" error`,
		});
	});
	await snapshotQueries(async () => {
		await confirmYesButton.click();
		await awaitCacheKey("accountConnectionIntentions.accept", { errored: 1 });
		await verifyToastTexts(
			`Error accepting invite: Mock "accountConnectionIntentions.accept" error`,
		);
	});
	await expect(page.getByLabel("Email to connect")).toBeAttached();

	// Retry with the second candidate
	const retryOption = suggestOption(secondUser.name);
	await input.click();
	await retryOption.click();
	await expect(confirmDialog).toContainText(
		`This will connect account "${intention.account.email}" with a user "${secondUser.name}"`,
	);
	api.mockFirst("accountConnectionIntentions.accept", {
		id: intention.account.id,
		email: intention.account.email,
		avatarUrl: undefined,
	});
	await snapshotQueries(
		async () => {
			await confirmYesButton.click();
			await awaitCacheKey("accountConnectionIntentions.accept", {
				succeed: 1,
			});
		},
		{ name: "success" },
	);
	await expect(page.getByLabel("Email to connect")).not.toBeAttached();
});
