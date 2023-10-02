import type { cache } from "app/cache";
import type { UpdaterRevertResult } from "app/cache/utils";
import { mergeUpdaterResults } from "app/cache/utils";
import type { TRPCQueryOutput } from "app/trpc";

export type Intention = TRPCQueryOutput<"debts.getIntentions">[number];

export const updateGetByUsers = (
	controller: Parameters<
		NonNullable<
			Parameters<(typeof cache)["debts"]["updateRevert"]>[1]["getByUsers"]
		>
	>[0],
	intentions: Intention[],
) =>
	mergeUpdaterResults(
		...intentions.reduce<(UpdaterRevertResult | undefined)[]>(
			(acc, { current, userId, amount, currencyCode }) => [
				...acc,
				current
					? controller.update(
							userId,
							current.currencyCode,
							(sum) => sum - current.amount,
							(snapshot) => () => snapshot,
					  )
					: undefined,
				controller.update(
					userId,
					currencyCode,
					(sum) => sum + amount,
					(snapshot) => () => snapshot,
				),
			],
			[],
		),
	);

export const updateGetUser = (
	controller: Parameters<
		NonNullable<
			Parameters<(typeof cache)["debts"]["updateRevert"]>[1]["getUser"]
		>
	>[0],
	intentions: Intention[],
) =>
	mergeUpdaterResults(
		...intentions.reduce<(UpdaterRevertResult | undefined)[]>(
			(
				acc,
				{
					id,
					current,
					userId,
					amount,
					currencyCode,
					timestamp,
					lockedTimestamp,
					note,
					receiptId,
				},
			) => [
				...acc,
				current
					? controller.update(
							userId,
							id,
							(debt) => ({
								...debt,
								currencyCode,
								amount,
								timestamp,
								lockedTimestamp,
							}),
							(snapshot) => (debt) => ({
								...debt,
								currencyCode: snapshot.currencyCode,
								amount: snapshot.amount,
								timestamp: snapshot.timestamp,
								lockedTimestamp: snapshot.lockedTimestamp,
							}),
					  )
					: controller.add(userId, {
							id,
							currencyCode,
							amount,
							timestamp,
							// Will be overriden on onSuccess
							created: new Date(),
							note,
							lockedTimestamp,
							their: { lockedTimestamp },
							receiptId,
					  }),
			],
			[],
		),
	);

export const updateGet = (
	controller: Parameters<
		NonNullable<Parameters<(typeof cache)["debts"]["updateRevert"]>[1]["get"]>
	>[0],
	intentions: Intention[],
) =>
	mergeUpdaterResults(
		...intentions.reduce<(UpdaterRevertResult | undefined)[]>(
			(
				acc,
				{
					id,
					current,
					userId,
					currencyCode,
					amount,
					timestamp,
					lockedTimestamp,
					note,
					receiptId,
				},
			) => [
				...acc,
				current
					? controller.update(
							id,
							(debt) => ({
								...debt,
								currencyCode,
								amount,
								timestamp,
								lockedTimestamp,
							}),
							(snapshot) => (debt) => ({
								...debt,
								currencyCode: snapshot.currencyCode,
								amount: snapshot.amount,
								timestamp: snapshot.timestamp,
								lockedTimestamp: snapshot.lockedTimestamp,
							}),
					  )
					: controller.add({
							id,
							userId,
							currencyCode,
							amount,
							timestamp,
							note,
							lockedTimestamp,
							their: { lockedTimestamp },
							receiptId,
					  }),
			],
			[],
		),
	);

export const updateGetUserSuccess = (
	controller: Parameters<
		NonNullable<Parameters<(typeof cache)["debts"]["update"]>[1]["getUser"]>
	>[0],
	intentions: (Intention & { created: Date })[],
) => {
	intentions.forEach(({ id, userId, current, created }) => {
		if (!current) {
			return;
		}
		controller.update(userId, id, (debt) => ({ ...debt, created }));
	});
};
