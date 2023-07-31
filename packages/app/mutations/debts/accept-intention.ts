import { cache } from "app/cache";
import { mergeUpdaterResults } from "app/cache/utils";
import { UseContextedMutationOptions } from "app/hooks/use-trpc-mutation-options";
import { CurrencyCode } from "app/utils/currency";
import { noop } from "app/utils/utils";
import { DebtsId, ReceiptsId, UsersId } from "next-app/db/models";

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
		(trpcContext, { userId, intended, current }) =>
		(updateObject) =>
			cache.debts.updateRevert(trpcContext, {
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
		(trpcContext, { userId, current }) =>
		({ created }, updateObject) => {
			if (current) {
				return;
			}
			cache.debts.update(trpcContext, {
				getByUsers: noop,
				getUser: (controller) =>
					controller.update(userId, updateObject.id, (debt) => ({
						...debt,
						created,
					})),
				get: noop,
				getIntentions: noop,
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
