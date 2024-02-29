import type { TRPCQueryOutput, TRPCReactContext } from "~app/trpc";
import type { CurrencyCode } from "~app/utils/currency";
import { upsertInArray } from "~utils";
import type { UsersId } from "~web/db/models";

import type { ControllerContext, SnapshotFn, UpdateFn } from "../../types";
import { applyUpdateFnWithRevert, withRef } from "../utils";

type Controller = TRPCReactContext["debts"]["getByUsers"];

type AllDebts = TRPCQueryOutput<"debts.getByUsers">;
type Debts = AllDebts[number]["debts"];
type Debt = Debts[number];

const updateUserDebts = (
	controller: Controller,
	userId: UsersId,
	updater: (debts: Debts) => Debts,
) =>
	controller.setData(undefined, (prevData) =>
		prevData
			? upsertInArray<(typeof prevData)[number]>(
					prevData,
					(debtsEntry) => debtsEntry.userId === userId,
					(user) => {
						const nextDebts = updater(user.debts);
						if (nextDebts === user.debts) {
							return user;
						}
						return { ...user, debts: nextDebts };
					},
					{ userId, debts: [] },
			  ).filter((userDebts) => userDebts.debts.length !== 0)
			: undefined,
	);

const updateCurrencyDebts =
	(controller: Controller, userId: UsersId, currencyCode: CurrencyCode) =>
	(updater: UpdateFn<number>) =>
		withRef<Debt | undefined>((ref) => {
			updateUserDebts(controller, userId, (debts) =>
				upsertInArray(
					debts,
					(debt) => debt.currencyCode === currencyCode,
					(userCurrency) => {
						const nextSum = updater(userCurrency.sum);
						if (nextSum === userCurrency.sum) {
							return userCurrency;
						}
						return { ...userCurrency, sum: nextSum };
					},
					{ currencyCode, sum: 0 },
					ref,
				),
			);
		}).current?.sum;

const invalidate = (controller: Controller) => () => controller.invalidate();

export const getController = ({ trpcContext }: ControllerContext) => {
	const controller = trpcContext.debts.getByUsers;
	return {
		update: (
			userId: UsersId,
			currencyCode: CurrencyCode,
			updater: UpdateFn<number>,
		) => updateCurrencyDebts(controller, userId, currencyCode)(updater),
		invalidate: invalidate(controller),
	};
};

export const getRevertController = ({ trpcContext }: ControllerContext) => {
	const controller = trpcContext.debts.getByUsers;
	return {
		update: (
			userId: UsersId,
			currencyCode: CurrencyCode,
			updater: UpdateFn<number>,
			revertUpdater: SnapshotFn<number>,
		) =>
			applyUpdateFnWithRevert(
				updateCurrencyDebts(controller, userId, currencyCode),
				updater,
				revertUpdater,
			),
		invalidate: invalidate(controller),
	};
};
