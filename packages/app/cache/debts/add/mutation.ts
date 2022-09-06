import { v4 } from "uuid";

import { cache, Revert } from "app/cache";
import { UseContextedMutationOptions } from "app/hooks/use-trpc-mutation-options";
import { TRPCMutationInput, TRPCQueryOutput } from "app/trpc";
import { DebtsId } from "next-app/db/models";

type DebtSum = number;
type DebtUserSnapshot = TRPCQueryOutput<"debts.getUser">[number];
type DebtSnapshot = TRPCQueryOutput<"debts.get">;

const createUserDebt = (
	id: DebtsId,
	updateObject: TRPCMutationInput<"debts.add">
): DebtUserSnapshot => ({
	id,
	amount: updateObject.amount,
	currency: updateObject.currency,
	created: new Date(),
	timestamp: updateObject.timestamp || new Date(),
	note: updateObject.note,
	locked: false,
	status: "nosync",
	intentionDirection: undefined,
	receiptId: null,
});

const createDebt = (
	id: DebtsId,
	updateObject: TRPCMutationInput<"debts.add">
): DebtSnapshot => ({
	id,
	amount: updateObject.amount,
	currency: updateObject.currency,
	userId: updateObject.userId,
	timestamp: updateObject.timestamp || new Date(),
	note: updateObject.note,
	locked: false,
	status: "nosync",
	intentionDirection: undefined,
	receiptId: null,
});

export const mutationOptions: UseContextedMutationOptions<
	"debts.add",
	{ id: DebtsId; sumRevert?: Revert<DebtSum> }
> = {
	onMutate: (trpcContext) => (updateObject) => {
		const updatedSum = cache.debts.getByUsers.update(
			trpcContext,
			updateObject.userId,
			updateObject.currency,
			(sum) => sum + updateObject.amount
		);
		const temporaryId = v4();
		cache.debts.getUser.add(
			trpcContext,
			updateObject.userId,
			createUserDebt(temporaryId, updateObject)
		);
		cache.debts.get.add(trpcContext, createDebt(temporaryId, updateObject));
		return {
			id: temporaryId,
			sumRevert:
				updatedSum !== undefined
					? (sum) => sum - updateObject.amount
					: undefined,
		};
	},
	onSuccess:
		(trpcContext) =>
		(stableId, updateObject, { id }) => {
			cache.debts.getUser.update(
				trpcContext,
				updateObject.userId,
				id,
				(debt) => ({ ...debt, id: stableId })
			);
			cache.debts.get.update(trpcContext, id, (debt) => ({
				...debt,
				id: stableId,
			}));
			cache.debts.getByReceiptId.add(
				trpcContext,
				createDebt(stableId, updateObject)
			);
		},
	onError:
		(trpcContext) =>
		(_error, updateObject, { sumRevert, id } = { id: "" }) => {
			if (sumRevert) {
				cache.debts.getByUsers.update(
					trpcContext,
					updateObject.userId,
					updateObject.currency,
					sumRevert
				);
			}
			if (id) {
				cache.debts.getUser.remove(trpcContext, updateObject.userId, id);
				cache.debts.get.remove(trpcContext, id);
			}
		},
};
