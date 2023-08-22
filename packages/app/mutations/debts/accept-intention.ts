import { cache } from "app/cache";
import { mergeUpdaterResults } from "app/cache/utils";
import type { UseContextedMutationOptions } from "app/hooks/use-trpc-mutation-options";
import type { CurrencyCode } from "app/utils/currency";
import type { DebtsId, ReceiptsId, UsersId } from "next-app/db/models";

export const options: UseContextedMutationOptions<
	"debts.acceptIntention",
	{
		debtId: DebtsId;
		userId: UsersId;
		intended: {
			amount: number;
			currencyCode: CurrencyCode;
			timestamp: Date;
			lockedTimestamp: Date;
			note: string;
			receiptId: ReceiptsId | null;
		};
		current?: {
			amount: number;
			currencyCode: CurrencyCode;
		};
	}
> = {
	onMutate:
		(controllerContext, { userId, intended, current }) =>
		(updateObject) =>
			cache.debts.updateRevert(controllerContext, {
				getByUsers: (controller) =>
					mergeUpdaterResults(
						...[
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
								intended.currencyCode,
								(sum) => sum + intended.amount,
								(snapshot) => () => snapshot,
							),
						],
					),
				getUser: (controller) => {
					if (current) {
						return controller.update(
							userId,
							updateObject.id,
							(debt) => ({
								...debt,
								currencyCode: intended.currencyCode,
								amount: intended.amount,
								timestamp: intended.timestamp,
								lockedTimestamp: intended.lockedTimestamp,
							}),
							(snapshot) => (debt) => ({
								...debt,
								currencyCode: snapshot.currencyCode,
								amount: snapshot.amount,
								timestamp: snapshot.timestamp,
								lockedTimestamp: snapshot.lockedTimestamp,
							}),
						);
					}
					return controller.add(userId, {
						id: updateObject.id,
						currencyCode: intended.currencyCode,
						amount: intended.amount,
						timestamp: intended.timestamp,
						// Will be overriden on onSuccess
						created: new Date(),
						note: intended.note,
						lockedTimestamp: intended.lockedTimestamp,
						their: { lockedTimestamp: intended.lockedTimestamp },
						receiptId: intended.receiptId,
					});
				},
				get: (controller) => {
					if (current) {
						return controller.update(
							updateObject.id,
							(debt) => ({
								...debt,
								currencyCode: intended.currencyCode,
								amount: intended.amount,
								timestamp: intended.timestamp,
								lockedTimestamp: intended.lockedTimestamp,
							}),
							(snapshot) => (debt) => ({
								...debt,
								currencyCode: snapshot.currencyCode,
								amount: snapshot.amount,
								timestamp: snapshot.timestamp,
								lockedTimestamp: snapshot.lockedTimestamp,
							}),
						);
					}
					return controller.add({
						id: updateObject.id,
						userId,
						currencyCode: intended.currencyCode,
						amount: intended.amount,
						timestamp: intended.timestamp,
						note: intended.note,
						lockedTimestamp: intended.lockedTimestamp,
						their: { lockedTimestamp: intended.lockedTimestamp },
						receiptId: intended.receiptId,
					});
				},
				getIntentions: (controller) => controller.remove(updateObject.id),
			}),
	onSuccess:
		(controllerContext, { userId, current }) =>
		({ created }, updateObject) => {
			if (current) {
				return;
			}
			cache.debts.update(controllerContext, {
				getByUsers: undefined,
				getUser: (controller) =>
					controller.update(userId, updateObject.id, (debt) => ({
						...debt,
						created,
					})),
				get: undefined,
				getIntentions: undefined,
			});
		},
	mutateToastOptions: {
		text: `Accepting debt..`,
	},
	successToastOptions: {
		text: `Debt accepted successfully`,
	},
	errorToastOptions: () => (error) => ({
		text: `Error accepting debt: ${error.message}`,
	}),
};
