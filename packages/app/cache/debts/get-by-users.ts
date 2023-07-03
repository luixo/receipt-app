import * as utils from "app/cache/utils";
import { TRPCQueryOutput, TRPCReactContext } from "app/trpc";
import { upsertInArray } from "app/utils/array";
import { Currency } from "app/utils/currency";
import { alwaysTrue } from "app/utils/utils";
import { UsersId } from "next-app/db/models";

type Controller = utils.GenericController<"debts.getByUsers">;

type AllDebts = TRPCQueryOutput<"debts.getByUsers">;
type Debts = AllDebts[number]["debts"];
type Debt = Debts[number];

const updateUserDebts = (
	controller: Controller,
	userId: UsersId,
	updater: (debts: Debts) => Debts
) =>
	controller.update((_input, prevData) =>
		upsertInArray<typeof prevData[number]>(
			prevData,
			(debtsEntry) => debtsEntry.userId === userId,
			(user) => {
				const nextDebts = updater(user.debts);
				if (nextDebts === user.debts) {
					return user;
				}
				return { ...user, debts: nextDebts };
			},
			{ userId, debts: [] }
		).filter((userDebts) => userDebts.debts.length !== 0)
	);

const updateCurrencyDebts =
	(controller: Controller, userId: UsersId, currency: Currency) =>
	(updater: utils.UpdateFn<number>) =>
		utils.withRef<Debt | undefined>((ref) => {
			updateUserDebts(controller, userId, (debts) =>
				upsertInArray(
					debts,
					(debt) => debt.currency === currency,
					(userCurrency) => {
						const nextSum = updater(userCurrency.sum);
						if (nextSum === userCurrency.sum) {
							return userCurrency;
						}
						return { ...userCurrency, sum: nextSum };
					},
					{ currency, sum: 0 },
					ref
				)
			);
		}).current?.sum;

const invalidate = (controller: Controller) => () =>
	controller.invalidate(alwaysTrue);

export const getController = (trpc: TRPCReactContext) => {
	const controller = utils.createController(trpc, "debts.getByUsers");
	return {
		update: (
			userId: UsersId,
			currency: Currency,
			updater: utils.UpdateFn<number>
		) => updateCurrencyDebts(controller, userId, currency)(updater),
		invalidate: invalidate(controller),
	};
};

export const getRevertController = (trpc: TRPCReactContext) => {
	const controller = utils.createController(trpc, "debts.getByUsers");
	return {
		update: (
			userId: UsersId,
			currency: Currency,
			updater: utils.UpdateFn<number>,
			revertUpdater: utils.SnapshotFn<number>
		) =>
			utils.applyUpdateFnWithRevert(
				updateCurrencyDebts(controller, userId, currency),
				updater,
				revertUpdater
			),
		invalidate: invalidate(controller),
	};
};
