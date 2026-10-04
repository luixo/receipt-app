import { TRPCError } from "@trpc/server";
import assert from "node:assert";

import { getParticipantSums } from "~app/utils/receipt-item";
import { expect } from "~tests/frontend/fixtures";
import {
	defaultGenerateDebtsFromReceipt,
	ourDesynced,
	remapDebts,
	theirDesynced,
	theirNonExistent,
} from "~tests/frontend/generators/debts";
import { defaultGeneratePeers } from "~tests/frontend/generators/peers";
import {
	defaultGenerateReceipt,
	defaultGenerateReceiptItemsWithConsumers,
	defaultGenerateReceiptPayers,
} from "~tests/frontend/generators/receipts";

import { test } from "./utils";

test.describe("Owner", () => {
	test("Collapsed and expanded participant shows consumption, payment and receipt-level payer", async ({
		api,
		mockReceipt,
		openReceipt,
		openParticipantsPicker,
		participantRow,
		participantPayerPart,
		awaitCacheKey,
		snapshotQueries,
	}) => {
		const { receipt, peers, receiptItemsWithConsumers } = await mockReceipt({
			generateReceiptPayers: (opts) =>
				defaultGenerateReceiptPayers({
					...opts,
					peers: opts.peers,
					addSelf: true,
				}),
		});
		const [peer] = peers;
		assert.ok(peer);
		api.mockFirst("receiptItemConsumers.add", {
			createdAt: Temporal.Now.zonedDateTimeISO(),
		});
		await openReceipt(receipt);
		await openParticipantsPicker();
		const row = participantRow(peer.name);
		await expect(row).toContainText(peer.name);
		await row.getByTestId("user-avatar").click();
		for (const item of receiptItemsWithConsumers) {
			await expect(row).toContainText(item.name);
		}
		await snapshotQueries(async () => {
			await row.getByRole("button", { name: "+ payer" }).click();
			await awaitCacheKey("receiptItemConsumers.add", 1);
		});
		await expect(participantPayerPart(peer.name)).toHaveValue("1");
	});

	test("Owner removes a zero-balance non-consumer without confirmation", async ({
		api,
		mockReceipt,
		openReceipt,
		openParticipantsPicker,
		participantRow,
		awaitCacheKey,
		snapshotQueries,
	}) => {
		const { receipt, peers } = await mockReceipt({
			generateReceiptItemsWithConsumers: (opts) =>
				defaultGenerateReceiptItemsWithConsumers({
					...opts,
					participants: opts.participants.slice(1),
				}),
		});
		const [peer] = peers;
		assert.ok(peer);
		api.mockFirst("receiptParticipants.remove", undefined);
		await openReceipt(receipt);
		await openParticipantsPicker();
		const row = participantRow(peer.name);
		await expect(row).toBeVisible();
		await snapshotQueries(async () => {
			await row.getByTestId("remove-button").click();
			await awaitCacheKey("receiptParticipants.remove", 1);
		});
		await expect(row).not.toBeAttached();
	});

	test("A nonzero-balance participant requires confirmation; cancel preserves the row", async ({
		api,
		mockReceipt,
		openReceipt,
		openParticipantsPicker,
		participantRow,
		page,
		modal,
		awaitCacheKey,
		snapshotQueries,
	}) => {
		const { receipt, peers } = await mockReceipt();
		const [peer] = peers;
		assert.ok(peer);
		api.mockFirst("receiptParticipants.remove", undefined);
		await openReceipt(receipt);
		await openParticipantsPicker();
		const row = participantRow(peer.name);
		await row.getByTestId("remove-button").click();
		const confirmationModal = modal().filter({ hasText: "Are you sure?" });
		await expect(confirmationModal).toBeVisible();
		await page.keyboard.press("Escape");
		await expect(row).toBeVisible();
		await snapshotQueries(async () => {
			await row.getByTestId("remove-button").click();
			await confirmationModal.getByRole("button", { name: "Yes" }).click();
			await awaitCacheKey("receiptParticipants.remove", 1);
		});
		await expect(row).not.toBeAttached();
	});

	test("Missing outgoing debt warns the owner without requesting a nonexistent debt", async ({
		mockReceipt,
		openReceipt,
		openParticipantsPicker,
		participantRow,
	}) => {
		const { receipt, peers } = await mockReceipt({ generateDebts: () => [] });
		const [peer] = peers;
		assert.ok(peer);
		await openReceipt(receipt);
		await openParticipantsPicker();
		await expect(
			participantRow(peer.name).getByTestId("participant-debt-warning"),
		).toBeVisible();
	});

	for (const { name, map, warning, connected } of [
		{
			name: "mismatched outgoing debt",
			map: ourDesynced,
			warning: true,
			connected: false,
		},
		{
			name: "connected peer missing reverse debt",
			map: theirNonExistent,
			warning: true,
			connected: true,
		},
		{
			name: "connected peer with mismatched reverse debt",
			map: theirDesynced,
			warning: true,
			connected: true,
		},
		{
			name: "unconnected peer missing reverse debt",
			map: theirNonExistent,
			warning: false,
			connected: false,
		},
	] as const) {
		test(`Owner debt warning: ${name}`, async ({
			mockReceipt,
			openReceipt,
			openParticipantsPicker,
			participantRow,
			faker,
		}) => {
			const { receipt, peers } = await mockReceipt({
				generatePeers: (opts) =>
					defaultGeneratePeers(opts).map((peer) => ({
						...peer,
						connectedUser: connected
							? { id: faker.string.uuid(), email: faker.internet.email() }
							: undefined,
					})),
				generateDebts: (opts) =>
					remapDebts(map)(defaultGenerateDebtsFromReceipt(opts)),
			});
			const [peer] = peers;
			assert.ok(peer);
			await openReceipt(receipt);
			await openParticipantsPicker();
			await expect(
				participantRow(peer.name).getByTestId("participant-debt-warning"),
			).toHaveCount(warning ? 1 : 0);
		});
	}

	test("Payer part autosaves on blur and zero immediately removes the receipt-level payer", async ({
		api,
		mockReceipt,
		openReceipt,
		openParticipantsPicker,
		participantRows,
		awaitCacheKey,
		snapshotQueries,
	}) => {
		const { receipt } = await mockReceipt({
			generateReceiptPayers: (opts) =>
				defaultGenerateReceiptPayers({ ...opts, addSelf: true }).map(
					(payer) => ({
						...payer,
						part: 2,
					}),
				),
		});
		api.mockFirst("receiptItemConsumers.update", undefined);
		api.mockFirst("receiptItemConsumers.remove", undefined);
		await openReceipt(receipt);
		await openParticipantsPicker();
		const owner = participantRows.first();
		await owner.getByTestId("user-avatar").click();
		const part = owner.getByRole("textbox", { name: "Item payer part" });
		await expect(part).toHaveValue("2");
		await snapshotQueries(async () => {
			await part.fill("3");
			await part.press("Tab");
			await awaitCacheKey("receiptItemConsumers.update", 1);
		});
		await snapshotQueries(
			async () => {
				await part.fill("0");
				await part.press("Tab");
				await awaitCacheKey("receiptItemConsumers.remove", 1);
			},
			{ name: "remove-payer" },
		);
		await expect(owner.getByRole("button", { name: "+ payer" })).toBeVisible();
	});
});

test.describe("Guest", () => {
	test("Guest own missing debt warns without querying a nonexistent debt", async ({
		api,
		mockReceipt,
		openReceipt,
		openParticipantsPicker,
		participantRows,
	}) => {
		const { receipt, selfPeerId } = await mockReceipt({
			generateReceiptParticipants: ({ selfPeerId: self, peers: allPeers }) => {
				const [owner, ...rest] = allPeers;
				assert.ok(owner);
				return [
					{
						peerId: owner.id,
						role: "owner" as const,
						createdAt: Temporal.Now.zonedDateTimeISO(),
					},
					...rest.map((peer) => ({
						peerId: peer.id,
						role: "editor" as const,
						createdAt: Temporal.Now.zonedDateTimeISO(),
					})),
					{
						peerId: self,
						role: "editor" as const,
						createdAt: Temporal.Now.zonedDateTimeISO(),
					},
				];
			},
			generateReceipt: (opts) => ({
				...defaultGenerateReceipt(opts),
				ownerPeerId: opts.peers[0]?.id ?? opts.selfPeerId,
				debts: {
					direction: "incoming",
					id: undefined,
					hasMine: false,
					hasForeign: false,
				},
			}),
		});
		api.mockFirst("peers.getForeign", ({ input, next }) =>
			input.id === selfPeerId
				? {
						id: selfPeerId,
						name: "Guest",
						publicName: undefined,
						connectedUser: undefined,
					}
				: next(),
		);
		expect(receipt.ownerPeerId).not.toBe(receipt.selfPeerId);
		await openReceipt(receipt);
		await openParticipantsPicker();
		const selfRow = participantRows.last();
		await expect(selfRow.getByTestId("participant-debt-warning")).toBeVisible();
	});

	test("Guest own debt compares against the negative participant balance", async ({
		api,
		mockReceipt,
		openReceipt,
		openParticipantsPicker,
		participantRows,
	}) => {
		let guestBalance: number | undefined = undefined;
		const { receipt, selfPeerId, receiptDebts } = await mockReceipt({
			generateReceiptParticipants: ({ selfPeerId: self, peers: allPeers }) => {
				const [owner, ...rest] = allPeers;
				assert.ok(owner);
				return [
					{
						peerId: owner.id,
						role: "owner" as const,
						createdAt: Temporal.Now.zonedDateTimeISO(),
					},
					...rest.map((peer) => ({
						peerId: peer.id,
						role: "editor" as const,
						createdAt: Temporal.Now.zonedDateTimeISO(),
					})),
					{
						peerId: self,
						role: "editor" as const,
						createdAt: Temporal.Now.zonedDateTimeISO(),
					},
				];
			},
			generateDebts: (opts) => {
				const [owner] = opts.participants;
				assert.ok(owner);
				const sums = getParticipantSums(
					opts.receiptBase.id,
					owner.peerId,
					opts.receiptItemsWithConsumers,
					opts.participants,
					opts.receiptPayers,
					opts.fromUnitToSubunit,
					opts.fromSubunitToUnit,
				);
				const selfSum = sums.find(({ peerId }) => peerId === opts.selfPeerId);
				assert.ok(selfSum);
				assert.ok(selfSum.balance !== 0);
				guestBalance = selfSum.balance;
				return [
					{
						id: opts.faker.string.uuid(),
						currencyCode: opts.receiptBase.currencyCode,
						receiptId: opts.receiptBase.id,
						peerId: opts.selfPeerId,
						timestamp: opts.receiptBase.issued,
						note: `Receipt "${opts.receiptBase.name}"`,
						amount: selfSum.balance,
						updatedAt: Temporal.Now.zonedDateTimeISO(),
						their: undefined,
					},
				];
			},
			generateReceipt: (opts) => {
				const [debt] = opts.receiptDebts;
				assert.ok(debt);
				return {
					...defaultGenerateReceipt(opts),
					ownerPeerId: opts.peers[0]?.id ?? opts.selfPeerId,
					debts: {
						direction: "incoming",
						id: debt.id,
						hasMine: true,
						hasForeign: false,
					},
				};
			},
		});
		assert.ok(receiptDebts[0]);
		api.mockFirst("peers.getForeign", ({ input, next }) =>
			input.id === selfPeerId
				? {
						id: selfPeerId,
						name: "Guest",
						publicName: undefined,
						connectedUser: undefined,
					}
				: next(),
		);
		expect(receipt.ownerPeerId).not.toBe(receipt.selfPeerId);
		expect(receiptDebts[0].amount).toBe(guestBalance);
		await openReceipt(receipt);
		await openParticipantsPicker();
		await expect(
			participantRows.last().getByTestId("participant-debt-warning"),
		).toBeVisible();
	});
});

test("Invalid payer part does not mutate", async ({
	api,
	mockReceipt,
	openReceipt,
	openParticipantsPicker,
	participantRows,
	snapshotQueries,
}) => {
	const { receipt } = await mockReceipt({
		generateReceiptPayers: (opts) =>
			defaultGenerateReceiptPayers({ ...opts, addSelf: true }).map((payer) => ({
				...payer,
				part: 2,
			})),
	});
	api.mockFirst("receiptItemConsumers.update", undefined);
	api.mockFirst("receiptItemConsumers.remove", undefined);
	await openReceipt(receipt);
	await openParticipantsPicker();
	const owner = participantRows.first();
	await owner.getByTestId("user-avatar").click();
	const part = owner.getByRole("textbox", { name: "Item payer part" });
	await expect(part).toHaveValue("2");
	await snapshotQueries(async () => {
		await part.fill("-1");
		await part.press("Tab");
		await expect(part).toHaveAttribute("aria-invalid", "true");
	});
	await expect(part).toHaveValue("-1");
});

test.describe("Mutations", () => {
	test('"receiptParticipants.update" mutation', async ({
		api,
		mockReceipt,
		openReceipt,
		openParticipantsPicker,
		participantRow,
		participantRole,
		page,
		awaitCacheKey,
		snapshotQueries,
		verifyToastTexts,
	}) => {
		const { receipt, peers } = await mockReceipt();
		const [peer] = peers;
		assert.ok(peer);
		const pause = api.createPause();
		const mockErrorMessage = `Mock "receiptParticipants.update" error`;
		api.mockFirst("receiptParticipants.update", async () => {
			await pause.promise;
			throw new TRPCError({ code: "FORBIDDEN", message: mockErrorMessage });
		});
		await openReceipt(receipt);
		await openParticipantsPicker();
		await participantRow(peer.name).getByTestId("user-avatar").click();
		await participantRole(peer.name).click();
		await snapshotQueries(
			async () => {
				await page
					.getByRole("option", { includeHidden: true })
					.filter({ visible: true, hasText: "Viewer" })
					.click();
				await awaitCacheKey("receiptParticipants.update", { pending: 1 });
			},
			{ name: "update-participant-pending" },
		);
		await snapshotQueries(
			async () => {
				pause.resolve();
				await awaitCacheKey("receiptParticipants.update", { error: 1 });
				await verifyToastTexts(
					`Error updating participant: ${mockErrorMessage}`,
				);
			},
			{ name: "update-participant-error" },
		);
	});

	test('"receiptParticipants.remove" mutation', async ({
		api,
		mockReceipt,
		openReceipt,
		openParticipantsPicker,
		participantRow,
		awaitCacheKey,
		snapshotQueries,
		verifyToastTexts,
	}) => {
		const { receipt, peers } = await mockReceipt({
			generateReceiptItemsWithConsumers: (opts) =>
				defaultGenerateReceiptItemsWithConsumers({
					...opts,
					participants: opts.participants.slice(1),
				}),
		});
		const [peer] = peers;
		assert.ok(peer);
		const pause = api.createPause();
		const mockErrorMessage = `Mock "receiptParticipants.remove" error`;
		api.mockFirst("receiptParticipants.remove", async () => {
			await pause.promise;
			throw new TRPCError({ code: "FORBIDDEN", message: mockErrorMessage });
		});
		await openReceipt(receipt);
		await openParticipantsPicker();
		await snapshotQueries(
			async () => {
				await participantRow(peer.name).getByTestId("remove-button").click();
				await awaitCacheKey("receiptParticipants.remove", { pending: 1 });
			},
			{ name: "remove-participant-pending" },
		);
		await snapshotQueries(
			async () => {
				pause.resolve();
				await awaitCacheKey("receiptParticipants.remove", { error: 1 });
				await verifyToastTexts(
					`Error removing participant: ${mockErrorMessage}`,
				);
			},
			{ name: "remove-participant-error" },
		);
	});

	test('"receiptItemConsumers.update" mutation', async ({
		api,
		mockReceipt,
		openReceipt,
		openParticipantsPicker,
		participantRows,
		awaitCacheKey,
		snapshotQueries,
		verifyToastTexts,
	}) => {
		const { receipt } = await mockReceipt({
			generateReceiptPayers: (opts) =>
				defaultGenerateReceiptPayers({ ...opts, addSelf: true }).map(
					(payer) => ({
						...payer,
						part: 2,
					}),
				),
		});
		const mockErrorMessage = `Mock "receiptParticipants.update" error`;
		const pause = api.createPause();
		api.mockFirst("receiptItemConsumers.update", async () => {
			await pause.promise;
			throw new TRPCError({
				code: "FORBIDDEN",
				message: mockErrorMessage,
			});
		});
		await openReceipt(receipt);
		await openParticipantsPicker();
		const owner = participantRows.first();
		await owner.getByTestId("user-avatar").click();
		const part = owner.getByRole("textbox", { name: "Item payer part" });
		await snapshotQueries(
			async () => {
				await part.fill("3");
				await part.press("Tab");
				await awaitCacheKey("receiptItemConsumers.update", { pending: 1 });
				await expect(owner.getByLabel("Loading")).toBeVisible();
			},
			{ name: "update-payer-pending" },
		);
		await snapshotQueries(
			async () => {
				pause.resolve();
				await awaitCacheKey("receiptItemConsumers.update", { error: 1 });
				await verifyToastTexts(mockErrorMessage);
			},
			{ name: "update-payer-error" },
		);
		await expect(part).toBeVisible();
		await expect(
			owner.getByRole("textbox", { name: "Item payer part" }),
		).toBeVisible();
	});

	test('"receiptItemConsumers.add" mutation', async ({
		api,
		mockReceipt,
		openReceipt,
		openParticipantsPicker,
		participantRow,
		awaitCacheKey,
		snapshotQueries,
		verifyToastTexts,
	}) => {
		const { receipt, peers } = await mockReceipt();
		const [peer] = peers;
		assert.ok(peer);
		const mockErrorMessage = `Mock "receiptItemConsumers.add" error`;
		const pause = api.createPause();
		api.mockFirst("receiptItemConsumers.add", async () => {
			await pause.promise;
			throw new TRPCError({
				code: "FORBIDDEN",
				message: mockErrorMessage,
			});
		});
		await openReceipt(receipt);
		await openParticipantsPicker();
		const row = participantRow(peer.name);
		await row.getByTestId("user-avatar").click();
		await snapshotQueries(
			async () => {
				await row.getByRole("button", { name: "+ payer" }).click();
				await awaitCacheKey("receiptItemConsumers.add", { pending: 1 });
			},
			{ name: "add-payer-pending" },
		);
		await snapshotQueries(
			async () => {
				pause.resolve();
				await awaitCacheKey("receiptItemConsumers.add", { error: 1 });
				await verifyToastTexts(mockErrorMessage);
			},
			{ name: "add-payer-error" },
		);
	});

	test('"receiptItemConsumers.remove" mutation', async ({
		api,
		mockReceipt,
		openReceipt,
		openParticipantsPicker,
		participantRows,
		awaitCacheKey,
		snapshotQueries,
		verifyToastTexts,
	}) => {
		const { receipt } = await mockReceipt({
			generateReceiptPayers: (opts) =>
				defaultGenerateReceiptPayers({ ...opts, addSelf: true }),
		});
		const pause = api.createPause();
		const mockErrorMessage = `Mock "receiptItemConsumers.remove" error`;
		api.mockFirst("receiptItemConsumers.remove", async () => {
			await pause.promise;
			throw new TRPCError({
				code: "FORBIDDEN",
				message: mockErrorMessage,
			});
		});
		await openReceipt(receipt);
		await openParticipantsPicker();
		const owner = participantRows.first();
		await owner.getByTestId("user-avatar").click();
		const part = owner.getByRole("textbox", { name: "Item payer part" });
		await snapshotQueries(
			async () => {
				await part.fill("0");
				await part.press("Tab");
				await awaitCacheKey("receiptItemConsumers.remove", { pending: 1 });
			},
			{ name: "remove-payer-pending" },
		);
		await snapshotQueries(
			async () => {
				pause.resolve();
				await awaitCacheKey("receiptItemConsumers.remove", { error: 1 });
				await verifyToastTexts(mockErrorMessage);
			},
			{ name: "remove-payer-error" },
		);
	});
});
