import { TRPCError } from "@trpc/server";

import { expect } from "@tests/frontend/fixtures";

import {
	generateDebtsWith,
	ourDesynced,
	ourNonExistent,
	ourSynced,
} from "./debts.generators";
import { test } from "./debts.utils";

test.describe("Receipt page", () => {
	test.describe("Debts", () => {
		test.describe("Create a debt with a 'debts.add' mutation", () => {
			test("loading", async ({
				api,
				sendDebtButton,
				mockReceiptWithDebts,
				openDebtsInfoModal,
				snapshotQueries,
				withLoader,
				verifyToastTexts,
				openReceiptWithDebts,
			}) => {
				const { receipt } = mockReceiptWithDebts({
					generateDebts: generateDebtsWith([ourDesynced, ourNonExistent]),
				});
				api.pause("debts.add");

				await openReceiptWithDebts(receipt.id);
				await openDebtsInfoModal();

				await snapshotQueries(async () => {
					const buttonWithLoader = withLoader(sendDebtButton);
					await expect(buttonWithLoader).not.toBeVisible();
					await sendDebtButton.click();
					await verifyToastTexts("Adding debt..");
					await expect(sendDebtButton).toBeDisabled();
					await expect(buttonWithLoader).toBeVisible();
				});
			});

			test.describe("success", () => {
				test("with auto-accept from the counterparty", async ({
					page,
					api,
					faker,
					sendDebtButton,
					mockReceiptWithDebts,
					openDebtsInfoModal,
					verifyToastTexts,
					snapshotQueries,
					openReceiptWithDebts,
				}) => {
					const { receipt } = mockReceiptWithDebts({
						generateDebts: generateDebtsWith([ourDesynced, ourNonExistent]),
					});
					api.mock("debts.add", () => ({
						id: faker.string.uuid(),
						lockedTimestamp: new Date(),
						reverseAccepted: true,
					}));

					await openReceiptWithDebts(receipt.id);
					await openDebtsInfoModal();

					await snapshotQueries(async () => {
						await sendDebtButton.click();
						await verifyToastTexts("Debt added");
						await expect(page).toHaveURL(`/receipts/${receipt.id}`);
					});
				});

				test("without auto-accept from the counterparty", async ({
					page,
					api,
					faker,
					sendDebtButton,
					mockReceiptWithDebts,
					openDebtsInfoModal,
					verifyToastTexts,
					snapshotQueries,
					openReceiptWithDebts,
				}) => {
					const { receipt } = mockReceiptWithDebts({
						generateDebts: generateDebtsWith([ourDesynced, ourNonExistent]),
					});
					api.mock("debts.add", () => ({
						id: faker.string.uuid(),
						lockedTimestamp: new Date("2020-01-01"),
						reverseAccepted: false,
					}));

					await openReceiptWithDebts(receipt.id);
					await openDebtsInfoModal();

					await snapshotQueries(async () => {
						await sendDebtButton.click();
						await verifyToastTexts("Debt added");
						await expect(page).toHaveURL(`/receipts/${receipt.id}`);
					});
				});
			});

			test("error", async ({
				page,
				api,
				faker,
				sendDebtButton,
				mockReceiptWithDebts,
				openDebtsInfoModal,
				snapshotQueries,
				verifyToastTexts,
				clearToasts,
				openReceiptWithDebts,
			}) => {
				const { receipt } = await mockReceiptWithDebts({
					generateDebts: generateDebtsWith([ourDesynced, ourNonExistent]),
				});
				api.mock("debts.add", () => {
					throw new TRPCError({
						code: "FORBIDDEN",
						message: "Forbidden to add a debt",
					});
				});

				await openReceiptWithDebts(receipt.id);
				await openDebtsInfoModal();

				await snapshotQueries(async () => {
					await sendDebtButton.click();
					await verifyToastTexts("Error adding debt: Forbidden to add a debt");
					await expect(page).toHaveURL(`/receipts/${receipt.id}`);
				});

				// Verify that "debts.add" works after error is removed
				api.mock("debts.add", () => ({
					id: faker.string.uuid(),
					lockedTimestamp: new Date(),
					reverseAccepted: false,
				}));
				await clearToasts();
				await sendDebtButton.click();
				await verifyToastTexts("Debt added");
				await expect(page).toHaveURL(`/receipts/${receipt.id}`);
			});
		});

		test.describe("Update a debt with a 'debts.update' mutation", () => {
			test("loading", async ({
				api,
				updateDebtButton,
				mockReceiptWithDebts,
				openDebtsInfoModal,
				snapshotQueries,
				verifyToastTexts,
				openReceiptWithDebts,
			}) => {
				const { receipt } = await mockReceiptWithDebts({
					generateDebts: generateDebtsWith([
						ourDesynced,
						...new Array(5).fill(ourSynced),
					]),
				});
				api.pause("debts.update");

				await openReceiptWithDebts(receipt.id);
				await openDebtsInfoModal();

				await snapshotQueries(async () => {
					await updateDebtButton.click();
					await verifyToastTexts("Updating debt..");
				});
			});

			test.describe("success", () => {
				test("with auto-accept from the counterparty", async ({
					page,
					api,
					updateDebtButton,
					mockReceiptWithDebts,
					openDebtsInfoModal,
					verifyToastTexts,
					snapshotQueries,
					openReceiptWithDebts,
				}) => {
					const { receipt } = await mockReceiptWithDebts({
						generateDebts: generateDebtsWith([
							ourDesynced,
							...new Array(5).fill(ourSynced),
						]),
					});
					api.mock("debts.update", () => ({
						lockedTimestamp: new Date(),
						reverseLockedTimestampUpdated: true,
					}));

					await openReceiptWithDebts(receipt.id);
					await openDebtsInfoModal();

					await snapshotQueries(async () => {
						await updateDebtButton.click();
						await verifyToastTexts("Debt updated successfully");
						await expect(page).toHaveURL(`/receipts/${receipt.id}`);
					});
				});

				test("without auto-accept from the counterparty", async ({
					page,
					api,
					updateDebtButton,
					mockReceiptWithDebts,
					openDebtsInfoModal,
					verifyToastTexts,
					snapshotQueries,
					openReceiptWithDebts,
				}) => {
					const { receipt } = await mockReceiptWithDebts({
						generateDebts: generateDebtsWith([
							ourDesynced,
							...new Array(5).fill(ourSynced),
						]),
					});
					api.mock("debts.update", () => ({
						lockedTimestamp: new Date("2020-01-01"),
						reverseLockedTimestampUpdated: false,
					}));

					await openReceiptWithDebts(receipt.id);
					await openDebtsInfoModal();

					await snapshotQueries(async () => {
						await updateDebtButton.click();
						await verifyToastTexts("Debt updated successfully");
						await expect(page).toHaveURL(`/receipts/${receipt.id}`);
					});
				});
			});

			test("error", async ({
				page,
				api,
				updateDebtButton,
				mockReceiptWithDebts,
				openDebtsInfoModal,
				snapshotQueries,
				verifyToastTexts,
				clearToasts,
				openReceiptWithDebts,
			}) => {
				const { receipt } = await mockReceiptWithDebts({
					generateDebts: generateDebtsWith([
						ourDesynced,
						...new Array(5).fill(ourSynced),
					]),
				});
				api.mock("debts.update", () => {
					throw new TRPCError({
						code: "FORBIDDEN",
						message: "Forbidden to update a debt",
					});
				});

				await openReceiptWithDebts(receipt.id);
				await openDebtsInfoModal();

				await snapshotQueries(async () => {
					await updateDebtButton.click();
					await verifyToastTexts(
						"Error updating debt: Forbidden to update a debt",
					);
					await expect(page).toHaveURL(`/receipts/${receipt.id}`);
				});

				// Verify that "debts.update" works after error is removed
				api.mock("debts.update", () => ({
					lockedTimestamp: new Date(),
					reverseLockedTimestampUpdated: false,
				}));
				await clearToasts();
				await updateDebtButton.click();
				await verifyToastTexts("Debt updated successfully");
				await expect(page).toHaveURL(`/receipts/${receipt.id}`);
			});
		});

		test.describe("Create and update debts with 'debts.addBatch' and 'debts.updateBatch' mutations", () => {
			test("loading", async ({
				api,
				updateDebtsButton,
				mockReceiptWithDebts,
				snapshotQueries,
				verifyToastTexts,
				openReceiptWithDebts,
			}) => {
				const { receipt } = await mockReceiptWithDebts({
					generateDebts: generateDebtsWith([
						ourDesynced,
						...new Array(5).fill(ourNonExistent),
					]),
				});
				api.pause("debts.addBatch");
				api.pause("debts.updateBatch");

				await openReceiptWithDebts(receipt.id);

				await snapshotQueries(async () => {
					await updateDebtsButton.click();
					await verifyToastTexts([/Adding \d debts../, "Updating debt.."]);
				});
			});

			test.describe("success", () => {
				test("with auto-accept from the counterparty", async ({
					page,
					api,
					faker,
					updateDebtsButton,
					mockReceiptWithDebts,
					verifyToastTexts,
					snapshotQueries,
					openReceiptWithDebts,
				}) => {
					const { receipt } = await mockReceiptWithDebts({
						generateDebts: generateDebtsWith([
							ourDesynced,
							...new Array(5).fill(ourNonExistent),
						]),
					});
					api.mock("debts.addBatch", (debts) => ({
						ids: debts.map(() => faker.string.uuid()),
						lockedTimestamp: new Date(),
						reverseAcceptedUserIds: [
							...new Set(debts.map((debt) => debt.userId)),
						],
					}));
					api.mock("debts.updateBatch", (debts) =>
						debts.map((debt) => ({
							lockedTimestamp: new Date(),
							debtId: debt.id,
							reverseLockedTimestampUpdated: true,
						})),
					);

					await openReceiptWithDebts(receipt.id);

					await snapshotQueries(async () => {
						await updateDebtsButton.click();
						await verifyToastTexts([
							"2 debts added",
							"Debt updated successfully",
						]);
						await expect(page).toHaveURL(`/receipts/${receipt.id}`);
					});
				});

				test("without auto-accept from the counterparty", async ({
					page,
					api,
					faker,
					updateDebtsButton,
					mockReceiptWithDebts,
					verifyToastTexts,
					snapshotQueries,
					openReceiptWithDebts,
				}) => {
					const { receipt } = await mockReceiptWithDebts({
						generateDebts: generateDebtsWith([
							ourDesynced,
							...new Array(5).fill(ourNonExistent),
						]),
					});
					api.mock("debts.addBatch", (debts) => ({
						ids: debts.map(() => faker.string.uuid()),
						lockedTimestamp: new Date(),
						reverseAcceptedUserIds: [],
					}));
					api.mock("debts.updateBatch", (debts) =>
						debts.map((debt) => ({
							lockedTimestamp: new Date(),
							debtId: debt.id,
							reverseLockedTimestampUpdated: false,
						})),
					);

					await openReceiptWithDebts(receipt.id);

					await snapshotQueries(async () => {
						await updateDebtsButton.click();
						await verifyToastTexts([
							/\d debts added/,
							"Debt updated successfully",
						]);
						await expect(page).toHaveURL(`/receipts/${receipt.id}`);
					});
				});
			});

			test.describe("error", () => {
				test("single request", async ({
					page,
					api,
					faker,
					updateDebtsButton,
					mockReceiptWithDebts,
					snapshotQueries,
					verifyToastTexts,
					clearToasts,
					openReceiptWithDebts,
				}) => {
					const { receipt } = await mockReceiptWithDebts({
						generateDebts: generateDebtsWith([
							ourDesynced,
							...new Array(5).fill(ourNonExistent),
						]),
					});
					api.mock("debts.addBatch", (debts) => ({
						ids: debts.map(() => faker.string.uuid()),
						lockedTimestamp: new Date(),
						reverseAcceptedUserIds: [],
					}));
					api.mock("debts.updateBatch", () => {
						throw new TRPCError({
							code: "FORBIDDEN",
							message: "Forbidden to update debts",
						});
					});

					await openReceiptWithDebts(receipt.id);

					await snapshotQueries(
						async () => {
							await updateDebtsButton.click();
							await verifyToastTexts([
								"Error updating debt: Forbidden to update debts",
								/\d debts added/,
							]);
						},
						{ name: "error" },
					);
					await expect(page).toHaveURL(`/receipts/${receipt.id}`);

					// Verify that "debts.updateBatch" works after error is removed
					api.mock("debts.updateBatch", (debts) =>
						debts.map((debt) => ({
							lockedTimestamp: new Date(),
							debtId: debt.id,
							reverseLockedTimestampUpdated: false,
						})),
					);
					await clearToasts();
					await snapshotQueries(
						async () => {
							await updateDebtsButton.click();
							await verifyToastTexts("Debt updated successfully");
						},
						{ name: "success" },
					);
					await expect(page).toHaveURL(`/receipts/${receipt.id}`);
				});

				test("both requests", async ({
					page,
					api,
					faker,
					updateDebtsButton,
					mockReceiptWithDebts,
					snapshotQueries,
					verifyToastTexts,
					clearToasts,
					openReceiptWithDebts,
				}) => {
					const { receipt } = await mockReceiptWithDebts({
						generateDebts: generateDebtsWith([
							ourDesynced,
							...new Array(5).fill(ourNonExistent),
						]),
					});
					api.mock("debts.addBatch", () => {
						throw new TRPCError({
							code: "FORBIDDEN",
							message: "Forbidden to add debts",
						});
					});
					api.mock("debts.updateBatch", () => {
						throw new TRPCError({
							code: "FORBIDDEN",
							message: "Forbidden to update debts",
						});
					});

					await openReceiptWithDebts(receipt.id);

					await snapshotQueries(async () => {
						await updateDebtsButton.click();
						await verifyToastTexts([
							/Error adding \d debts: Forbidden to add debts/,
							"Error updating debt: Forbidden to update debts",
						]);
					});
					await expect(page).toHaveURL(`/receipts/${receipt.id}`);

					// Verify that "debts.addBatch" and "debts.updateBatch" work after error is removed
					api.mock("debts.addBatch", (debts) => ({
						ids: debts.map(() => faker.string.uuid()),
						lockedTimestamp: new Date(),
						reverseAcceptedUserIds: [],
					}));
					api.mock("debts.updateBatch", (debts) =>
						debts.map((debt) => ({
							lockedTimestamp: new Date(),
							debtId: debt.id,
							reverseLockedTimestampUpdated: false,
						})),
					);
					await clearToasts();
					await updateDebtsButton.click();
					await verifyToastTexts([
						/\d debts added/,
						"Debt updated successfully",
					]);
					await expect(page).toHaveURL(`/receipts/${receipt.id}`);
				});
			});
		});
	});
});
