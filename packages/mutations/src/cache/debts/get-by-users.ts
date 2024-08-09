import type { TRPCQueryOutput, TRPCReactUtils } from "~app/trpc";
import type { CurrencyCode } from "~app/utils/currency";
import type { UsersId } from "~db";
import { upsertInArray } from "~utils";

import type { ControllerContext, SnapshotFn, UpdateFn } from "../../types";
import { applyUpdateFnWithRevert, withRef } from "../utils";

type Controller = TRPCReactUtils["debts"]["getByUsers"];

type AllDebts = TRPCQueryOutput<"debts.getByUsers">;
type UserDebts = AllDebts[number];
type Debts = UserDebts["debts"];
type Debt = Debts[number];

const updateUser = (
	controller: Controller,
	userId: UsersId,
	updater: UpdateFn<UserDebts>,
) =>
	controller.setData(undefined, (prevData) =>
		prevData
			? upsertInArray<(typeof prevData)[number]>(
					prevData,
					(debtsEntry) => debtsEntry.userId === userId,
					updater,
					{ userId, debts: [], unsyncedDebtsAmount: 0 },
			  ).filter((userDebts) => userDebts.debts.length !== 0)
			: undefined,
	);

const updateUserDebts = (
	controller: Controller,
	userId: UsersId,
	updater: UpdateFn<Debts>,
) =>
	withRef<Debts | undefined>((ref) => {
		updateUser(controller, userId, (user) => {
			const nextDebts = updater(user.debts);
			if (nextDebts === user.debts) {
				return user;
			}
			ref.current = nextDebts;
			return { ...user, debts: nextDebts };
		});
	}).current;

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

const updateUnsyncedDebts =
	(controller: Controller, userId: UsersId) => (updater: UpdateFn<number>) =>
		withRef<number | undefined>((ref) => {
			updateUser(controller, userId, (user) => {
				const nextUnsyncedDebtsAmount = updater(user.unsyncedDebtsAmount);
				if (nextUnsyncedDebtsAmount === user.unsyncedDebtsAmount) {
					return user;
				}
				ref.current = user.unsyncedDebtsAmount;
				return {
					...user,
					unsyncedDebtsAmount: nextUnsyncedDebtsAmount,
				};
			});
		}).current;

const invalidate = (controller: Controller) => () => controller.invalidate();

export const getController = ({ trpcUtils }: ControllerContext) => {
	const controller = trpcUtils.debts.getByUsers;
	return {
		updateUnsyncedDebts: (userId: UsersId, updater: UpdateFn<number>) =>
			updateUnsyncedDebts(controller, userId)(updater),
		updateCurrency: (
			userId: UsersId,
			currencyCode: CurrencyCode,
			updater: UpdateFn<number>,
		) => updateCurrencyDebts(controller, userId, currencyCode)(updater),
		invalidate: invalidate(controller),
	};
};

export const getRevertController = ({ trpcUtils }: ControllerContext) => {
	const controller = trpcUtils.debts.getByUsers;
	return {
		updateCurrency: (
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
