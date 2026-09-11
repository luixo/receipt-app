import { TRPCError } from "@trpc/server";
import assert from "node:assert";

import { formatCurrency, getCurrencySymbol } from "~app/utils/currency";
import { localSettings } from "~tests/frontend/consts";
import { expect } from "~tests/frontend/fixtures";
import { defaultGenerateDebts } from "~tests/frontend/generators/debts";
import {
	generateCurrencyCode,
	generateCurrencyCodes,
} from "~tests/frontend/generators/utils";
import { getNow } from "~utils/date";
import { round } from "~utils/math";

import { getPlannedDebtsAmount, test } from "./utils";

test.describe("Form", () => {
	test("Prefills rates and computes amounts and notes", async ({
		page,
		mockDebts,
		rateInput,
		plannedDebtsForm,
		snapshotQueries,
	}) => {
		const { debtUser, debts, rates } = await mockDebts();
		assert.ok(debts[0]);
		const fromCurrencyCode = debts[0].currencyCode;
		await snapshotQueries(
			() =>
				page.navigate({
					to: "/debts/user/$id/exchange/all",
					params: { id: debtUser.id },
					search: { from: fromCurrencyCode },
				}),
			{
				blacklistKeys: ["users.get"],
			},
		);

		const rowDebts = debts.filter(
			(debt) => debt.sum !== 0 && debt.currencyCode !== fromCurrencyCode,
		);
		// oxlint-disable-next-line typescript/await-thenable
		for await (const { currencyCode, sum } of rowDebts) {
			const rate = rates[currencyCode];
			assert.ok(rate);
			await expect(rateInput(currencyCode)).toHaveValue(rate.toString());
			await expect(
				plannedDebtsForm.getByText(
					formatCurrency(localSettings.locale, currencyCode, round(-sum)),
					{ exact: true },
				),
			).toBeVisible();
			const convertedAmount = -round(sum / rate);
			await expect(
				plannedDebtsForm
					.getByText(
						`Converted to ${
							convertedAmount
								? formatCurrency(
										localSettings.locale,
										fromCurrencyCode,
										convertedAmount,
									)
								: getCurrencySymbol(localSettings.locale, fromCurrencyCode)
						}`,
					)
					.first(),
			).toBeVisible();
		}
		const totalAmount = -round(
			rowDebts.reduce((acc, { currencyCode, sum }) => {
				const rate = rates[currencyCode] ?? 0;
				return acc + (rate ? -round(sum / rate) : 0);
			}, 0),
		);
		await expect(
			plannedDebtsForm.getByText(
				formatCurrency(
					localSettings.locale,
					fromCurrencyCode,
					round(totalAmount),
				),
				{ exact: true },
			),
		).toBeVisible();
		await expect(
			plannedDebtsForm
				.getByText(
					`Converted from ${rowDebts
						.map(({ currencyCode, sum }) =>
							formatCurrency(localSettings.locale, currencyCode, sum),
						)
						.join(", ")}`,
				)
				.first(),
		).toBeVisible();
	});

	test("Shows a validation error for a zero rate and disables submit", async ({
		mockDebts,
		rateInput,
		sendButton,
		page,
	}) => {
		const { debtUser, debts } = await mockDebts();
		assert.ok(debts[0]);
		const fromCurrencyCode = debts[0].currencyCode;
		await page.navigate({
			to: "/debts/user/$id/exchange/all",
			params: { id: debtUser.id },
			search: { from: fromCurrencyCode },
		});

		const rowDebt = debts.find(
			(debt) => debt.sum !== 0 && debt.currencyCode !== fromCurrencyCode,
		);
		assert.ok(rowDebt);
		await rateInput(rowDebt.currencyCode).fill("0");
		await rateInput(rowDebt.currencyCode).press("Tab");

		await expect(
			page.getByText("Currency rate should be non-zero"),
		).toBeVisible();
		await expect(sendButton).toBeDisabled();
	});

	test("Renders rows in the sorted order of currencies", async ({
		page,
		faker,
		mockDebts,
		plannedDebtsForm,
	}) => {
		const currencyCodes = generateCurrencyCodes(faker, {
			min: 3,
			max: 6,
		}).toSorted();
		const { debtUser, debts, rates } = await mockDebts({
			generateDebts: (opts) =>
				defaultGenerateDebts({ ...opts, amount: currencyCodes.length }).map(
					(debt, index) => {
						const currencyCode = currencyCodes[index];
						assert.ok(currencyCode);
						return {
							...debt,
							currencyCode,
							amount: faker.number.float({
								min: -10_000,
								max: 10_000,
								multipleOf: 0.01,
							}),
						};
					},
				),
		});
		assert.ok(debts[0]);
		const fromCurrencyCode = debts[0].currencyCode;
		await page.navigate({
			to: "/debts/user/$id/exchange/all",
			params: { id: debtUser.id },
			search: { from: fromCurrencyCode },
		});

		await expect(plannedDebtsForm.getByRole("textbox")).toHaveCount(
			currencyCodes.length - 1,
		);
		const inputLabels = await plannedDebtsForm
			.getByRole("textbox")
			.evaluateAll((elements) =>
				elements.map((element) => element.getAttribute("aria-label")),
			);
		const otherCodes = currencyCodes.filter(
			(code) => code !== fromCurrencyCode,
		);
		expect(inputLabels).toEqual(otherCodes);
		const totalAmount = -round(
			otherCodes.reduce((acc, currencyCode) => {
				const rate = rates[currencyCode];
				assert.ok(rate);
				const debt = debts.find(
					(lookupDebt) => lookupDebt.currencyCode === currencyCode,
				);
				assert.ok(debt);
				return acc + -round(debt.sum / rate);
			}, 0),
		);
		await expect(
			plannedDebtsForm.getByText(
				formatCurrency(
					localSettings.locale,
					fromCurrencyCode,
					round(totalAmount),
				),
				{ exact: true },
			),
		).toBeVisible();
	});

	test("Hides resolved currencies", async ({
		page,
		mockDebts,
		rateInput,
		plannedDebtsForm,
	}) => {
		const { debtUser, debts } = await mockDebts({
			generateDebts: (opts) =>
				defaultGenerateDebts({ ...opts, amount: 4 }).map((debt, index) =>
					index < 2
						? {
								...debt,
								currencyCode: "CHF",
								amount: index === 0 ? 100 : -100,
							}
						: debt,
				),
		});
		assert.ok(debts[2]);
		const fromCurrencyCode = debts[2].currencyCode;
		await page.navigate({
			to: "/debts/user/$id/exchange/all",
			params: { id: debtUser.id },
			search: { from: fromCurrencyCode },
		});

		const resolvedDebt = debts.find((debt) => debt.sum === 0);
		assert.ok(resolvedDebt, "Expected a resolved debt");
		await expect(rateInput(resolvedDebt.currencyCode)).not.toBeAttached();
		await expect(plannedDebtsForm.getByRole("textbox")).toHaveCount(
			debts.filter(
				(debt) => debt.sum !== 0 && debt.currencyCode !== fromCurrencyCode,
			).length,
		);
	});

	test("Shows only the selected currency when the user has no debts", async ({
		page,
		mockDebts,
		plannedDebtsForm,
		sendButton,
		snapshotQueries,
		faker,
	}) => {
		const { debtUser } = await mockDebts({ generateDebts: () => [] });
		await snapshotQueries(
			() =>
				page.navigate({
					to: "/debts/user/$id/exchange/all",
					params: { id: debtUser.id },
					search: { from: generateCurrencyCode(faker) },
				}),
			{ blacklistKeys: "users.get" },
		);

		await expect(plannedDebtsForm.getByRole("textbox")).toHaveCount(0);
		await expect(sendButton).toBeVisible();
	});
});

test.describe("Mutations", () => {
	test("Shows loading state and sends each debt", async ({
		api,
		page,
		mockDebts,
		sendButton,
		withLoader,
		verifyToastTexts,
	}) => {
		const { debtUser, debts } = await mockDebts();
		const createPause = api.createPause();
		api.mockFirst("debts.add", async () => {
			await createPause.promise;
			return {
				id: "test-debt-id",
				updatedAt: getNow.zonedDateTime(),
				reverseAccepted: false,
			};
		});
		assert.ok(debts[0]);
		const fromCurrencyCode = debts[0].currencyCode;
		await page.navigate({
			to: "/debts/user/$id/exchange/all",
			params: { id: debtUser.id },
			search: { from: fromCurrencyCode },
		});

		const plannedDebtsAmount = getPlannedDebtsAmount(debts, fromCurrencyCode);
		await sendButton.click();
		await verifyToastTexts(
			plannedDebtsAmount === 1
				? "Adding debt.."
				: `Adding ${plannedDebtsAmount} debts..`,
		);
		await expect(withLoader(sendButton)).toBeVisible();
		await expect(sendButton).toBeDisabled();
	});

	test("Submits all debts and navigates to the user page", async ({
		api,
		mockDebts,
		sendButton,
		awaitCacheKey,
		verifyToastTexts,
		snapshotQueries,
		page,
	}) => {
		const { debtUser, debts } = await mockDebts();
		api.mockFirst("debts.add", () => ({
			id: "test-debt-id",
			updatedAt: getNow.zonedDateTime(),
			reverseAccepted: false,
		}));
		assert.ok(debts[0]);
		const fromCurrencyCode = debts[0].currencyCode;
		await page.navigate({
			to: "/debts/user/$id/exchange/all",
			params: { id: debtUser.id },
			search: { from: fromCurrencyCode },
		});

		api.mockFirst("debts.getAllUser", { items: [] });
		api.mockFirst("debts.getByUserPaged", { items: [], count: 0, cursor: 0 });

		const plannedDebtsAmount = getPlannedDebtsAmount(debts, fromCurrencyCode);
		await snapshotQueries(
			async () => {
				await sendButton.click();
				await awaitCacheKey("debts.add", plannedDebtsAmount);
				await verifyToastTexts(
					plannedDebtsAmount === 1
						? "debt added"
						: `${plannedDebtsAmount} debts added`,
				);
			},
			{
				blacklistKeys: [
					"debts.getAllUser",
					"debts.getByUserPaged",
					"currency.rates",
				],
			},
		);
		await page.expectUrl({
			to: "/debts/user/$id",
			params: { id: debtUser.id },
		});
	});

	test("Shows mutation error on the submit button", async ({
		api,
		page,
		mockDebts,
		sendButton,
		awaitCacheKey,
		verifyToastTexts,
		snapshotQueries,
		consoleManager,
	}) => {
		const { debtUser, debts } = await mockDebts();
		const mockErrorMessage = `Mock "debts.add" error`;
		api.mockFirst("debts.add", () => {
			throw new TRPCError({
				code: "FORBIDDEN",
				message: mockErrorMessage,
			});
		});
		assert.ok(debts[0]);
		const fromCurrencyCode = debts[0].currencyCode;
		consoleManager.ignore(mockErrorMessage);
		await page.navigate({
			to: "/debts/user/$id/exchange/all",
			params: { id: debtUser.id },
			search: { from: fromCurrencyCode },
		});

		const plannedDebtsAmount = getPlannedDebtsAmount(debts, fromCurrencyCode);
		await snapshotQueries(
			async () => {
				await sendButton.click();
				await awaitCacheKey("debts.add", { error: plannedDebtsAmount });
				await verifyToastTexts(mockErrorMessage);
			},
			{ name: "error" },
		);
		await expect(sendButton).toHaveText(mockErrorMessage);
	});
});

test.describe("Other", () => {
	test("Shows an error when rates fail to load", async ({
		api,
		page,
		mockDebts,
		currencyGroupButtonByCode,
		errorMessage,
		consoleManager,
	}) => {
		const { debtUser, debts } = await mockDebts();
		const mockErrorMessage = `Mock "currency.rates" error`;
		api.mockFirst("currency.rates", () => {
			throw new TRPCError({
				code: "FORBIDDEN",
				message: mockErrorMessage,
			});
		});
		consoleManager.ignore(mockErrorMessage);
		await page.navigate({
			to: "/debts/user/$id/exchange/all",
			params: { id: debtUser.id },
		});

		const fromDebt = debts.find((debt) => debt.sum !== 0);
		assert.ok(fromDebt);
		await currencyGroupButtonByCode(fromDebt.currencyCode).click();
		await expect(errorMessage(mockErrorMessage)).toBeVisible();
	});
});
