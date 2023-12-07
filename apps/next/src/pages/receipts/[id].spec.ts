import { faker } from "@faker-js/faker";
import { TRPCError } from "@trpc/server";

import { expect } from "@tests/frontend/fixtures";

import type { ModifyOutcomingDebts } from "./[id].utils.spec";
import { test } from "./[id].utils.spec";

test.describe("Receipt page", () => {
	test.describe("Debts", () => {
		test.describe("Create a debt with a 'debts.add' mutation", () => {
			const onlyOneUnsyncedDebt: ModifyOutcomingDebts = (debts) => {
				if (debts.length < 2) {
					throw new Error(
						"Expected to have at least two debts - one to send sync and one to get info panel open",
					);
				}
				return [
					{ ...debts[0]!, amount: debts[0]!.amount + 1, their: undefined },
					...debts.slice(1),
				];
			};

			test("loading", async ({
				page,
				api,
				sendDebtButton,
				mockReceipt,
				openDebtsInfoPanel,
				snapshotQueries,
				withLoader,
				verifyToastTexts,
			}) => {
				const { receipt } = await mockReceipt({
					modifyOutcomingDebts: onlyOneUnsyncedDebt,
					lockedTimestamp: new Date(),
				});
				api.pause("debts.add");

				await page.goto(`/receipts/${receipt.id}`);
				await openDebtsInfoPanel();

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
					sendDebtButton,
					mockReceipt,
					openDebtsInfoPanel,
					verifyToastTexts,
					snapshotQueries,
				}) => {
					const { receipt } = await mockReceipt({
						modifyOutcomingDebts: onlyOneUnsyncedDebt,
						lockedTimestamp: new Date(),
					});
					api.mock("debts.add", () => ({
						id: faker.string.uuid(),
						lockedTimestamp: new Date(),
						reverseAccepted: true,
					}));

					await page.goto(`/receipts/${receipt.id}`);
					await openDebtsInfoPanel();

					await snapshotQueries(async () => {
						await sendDebtButton.click();
						await verifyToastTexts("Debt added");
						await expect(page).toHaveURL(`/receipts/${receipt.id}`);
					});
				});

				test("without auto-accept from the counterparty", async ({
					page,
					api,
					sendDebtButton,
					mockReceipt,
					openDebtsInfoPanel,
					verifyToastTexts,
					snapshotQueries,
				}) => {
					const { receipt } = await mockReceipt({
						modifyOutcomingDebts: onlyOneUnsyncedDebt,
						lockedTimestamp: new Date(),
					});
					api.mock("debts.add", () => ({
						id: faker.string.uuid(),
						lockedTimestamp: new Date("2020-01-01"),
						reverseAccepted: false,
					}));

					await page.goto(`/receipts/${receipt.id}`);
					await openDebtsInfoPanel();

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
				sendDebtButton,
				mockReceipt,
				openDebtsInfoPanel,
				snapshotQueries,
				verifyToastTexts,
				clearToasts,
			}) => {
				const { receipt } = await mockReceipt({
					modifyOutcomingDebts: onlyOneUnsyncedDebt,
					lockedTimestamp: new Date(),
				});
				api.mock("debts.add", () => {
					throw new TRPCError({
						code: "FORBIDDEN",
						message: "Forbidden to add a debt",
					});
				});

				await page.goto(`/receipts/${receipt.id}`);
				await openDebtsInfoPanel();

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
			const singleDebtLockedTimestampMismatch: ModifyOutcomingDebts = (
				debts,
				{ consts },
			) => {
				const firstNotSelfDebt = debts.find(
					(debt) => debt.userId !== consts.selfUser.id,
				);
				if (!firstNotSelfDebt) {
					throw new Error("Expected to have at least one non-self debt");
				}
				return [
					{
						...firstNotSelfDebt,
						amount: firstNotSelfDebt.amount + 1,
						their: {
							lockedTimestamp: new Date("2020-03-05"),
							amount: firstNotSelfDebt.amount + 1,
							currencyCode: firstNotSelfDebt.currencyCode,
							timestamp: firstNotSelfDebt.timestamp,
						},
					},
				];
			};

			test("loading", async ({
				page,
				api,
				updateDebtButton,
				mockReceipt,
				openDebtsInfoPanel,
				snapshotQueries,
				withLoader,
				verifyToastTexts,
			}) => {
				const { receipt } = await mockReceipt({
					modifyOutcomingDebts: singleDebtLockedTimestampMismatch,
					lockedTimestamp: new Date(),
				});
				api.pause("debts.update");

				await page.goto(`/receipts/${receipt.id}`);
				await openDebtsInfoPanel();

				await snapshotQueries(async () => {
					const buttonWithLoader = withLoader(updateDebtButton);
					await expect(buttonWithLoader).not.toBeVisible();
					await updateDebtButton.click();
					await verifyToastTexts("Updating debt..");
					await expect(updateDebtButton).toBeDisabled();
					await expect(buttonWithLoader).toBeVisible();
				});
			});

			test.describe("success", () => {
				test("with auto-accept from the counterparty", async ({
					page,
					api,
					updateDebtButton,
					mockReceipt,
					openDebtsInfoPanel,
					verifyToastTexts,
					snapshotQueries,
				}) => {
					const { receipt } = await mockReceipt({
						modifyOutcomingDebts: singleDebtLockedTimestampMismatch,
						lockedTimestamp: new Date(),
					});
					api.mock("debts.update", () => ({
						lockedTimestamp: new Date(),
						reverseLockedTimestampUpdated: true,
					}));

					await page.goto(`/receipts/${receipt.id}`);
					await openDebtsInfoPanel();

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
					mockReceipt,
					openDebtsInfoPanel,
					verifyToastTexts,
					snapshotQueries,
				}) => {
					const { receipt } = await mockReceipt({
						modifyOutcomingDebts: singleDebtLockedTimestampMismatch,
						lockedTimestamp: new Date(),
					});
					api.mock("debts.update", () => ({
						lockedTimestamp: new Date("2020-01-01"),
						reverseLockedTimestampUpdated: false,
					}));

					await page.goto(`/receipts/${receipt.id}`);
					await openDebtsInfoPanel();

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
				mockReceipt,
				openDebtsInfoPanel,
				snapshotQueries,
				verifyToastTexts,
				clearToasts,
			}) => {
				const { receipt } = await mockReceipt({
					modifyOutcomingDebts: singleDebtLockedTimestampMismatch,
					lockedTimestamp: new Date(),
				});
				api.mock("debts.update", () => {
					throw new TRPCError({
						code: "FORBIDDEN",
						message: "Forbidden to update a debt",
					});
				});

				await page.goto(`/receipts/${receipt.id}`);
				await openDebtsInfoPanel();

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
			const emptyDebts: ModifyOutcomingDebts = (debts) => [
				{ ...debts[0]!, amount: debts[0]!.amount + 1, their: undefined },
			];

			test("loading", async ({
				page,
				api,
				propagateDebtsButton,
				mockReceipt,
				snapshotQueries,
				withLoader,
				verifyToastTexts,
				awaitQuery,
			}) => {
				const { receipt } = await mockReceipt({
					modifyOutcomingDebts: emptyDebts,
					lockedTimestamp: new Date(),
				});
				api.pause("debts.addBatch");
				api.pause("debts.updateBatch");

				await page.goto(`/receipts/${receipt.id}`);
				await awaitQuery("currency.getList");

				await snapshotQueries(async () => {
					const buttonWithLoader = withLoader(propagateDebtsButton);
					await expect(buttonWithLoader).not.toBeVisible();
					await propagateDebtsButton.click();
					await verifyToastTexts(["Adding 3 debts..", "Updating debt.."]);
					await expect(propagateDebtsButton).toBeDisabled();
					await expect(buttonWithLoader).toBeVisible();
				});
			});

			test.describe("success", () => {
				test("with auto-accept from the counterparty", async ({
					page,
					api,
					propagateDebtsButton,
					mockReceipt,
					verifyToastTexts,
					snapshotQueries,
					awaitQuery,
				}) => {
					const { receipt } = await mockReceipt({
						modifyOutcomingDebts: emptyDebts,
						lockedTimestamp: new Date(),
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

					await page.goto(`/receipts/${receipt.id}`);
					await awaitQuery("currency.getList");

					await snapshotQueries(async () => {
						await propagateDebtsButton.click();
						await verifyToastTexts([
							"3 debts added",
							"Debt updated successfully",
						]);
						await expect(page).toHaveURL(`/receipts/${receipt.id}`);
					});
				});

				test("without auto-accept from the counterparty", async ({
					page,
					api,
					propagateDebtsButton,
					mockReceipt,
					verifyToastTexts,
					snapshotQueries,
					awaitQuery,
				}) => {
					const { receipt } = await mockReceipt({
						modifyOutcomingDebts: emptyDebts,
						lockedTimestamp: new Date(),
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

					await page.goto(`/receipts/${receipt.id}`);
					await awaitQuery("currency.getList");

					await snapshotQueries(async () => {
						await propagateDebtsButton.click();
						await verifyToastTexts([
							"3 debts added",
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
					propagateDebtsButton,
					mockReceipt,
					snapshotQueries,
					verifyToastTexts,
					clearToasts,
					awaitQuery,
				}) => {
					const { receipt } = await mockReceipt({
						modifyOutcomingDebts: emptyDebts,
						lockedTimestamp: new Date(),
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

					await page.goto(`/receipts/${receipt.id}`);
					await awaitQuery("currency.getList");

					await snapshotQueries(async () => {
						await propagateDebtsButton.click();
						await verifyToastTexts([
							"Error updating debt: Forbidden to update debts",
							"3 debts added",
						]);
					});
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
					await snapshotQueries(async () => {
						await propagateDebtsButton.click();
						await verifyToastTexts("Debt updated successfully");
					});
					await expect(page).toHaveURL(`/receipts/${receipt.id}`);
				});

				test("both requests", async ({
					page,
					api,
					propagateDebtsButton,
					mockReceipt,
					snapshotQueries,
					verifyToastTexts,
					clearToasts,
					awaitQuery,
				}) => {
					const { receipt } = await mockReceipt({
						modifyOutcomingDebts: emptyDebts,
						lockedTimestamp: new Date(),
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

					await page.goto(`/receipts/${receipt.id}`);
					await awaitQuery("currency.getList");

					await snapshotQueries(async () => {
						await propagateDebtsButton.click();
						await verifyToastTexts([
							"Error adding 3 debts: Forbidden to add debts",
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
					await propagateDebtsButton.click();
					await verifyToastTexts([
						"3 debts added",
						"Debt updated successfully",
					]);
					await expect(page).toHaveURL(`/receipts/${receipt.id}`);
				});
			});
		});
	});
});
