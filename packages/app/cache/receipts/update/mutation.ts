import { cache, Revert } from "app/cache";
import { UseContextedMutationOptions } from "app/hooks/use-trpc-mutation-options";
import { TRPCMutationInput, TRPCQueryOutput } from "app/trpc";

type PagedReceiptSnapshot =
	TRPCQueryOutput<"receipts.getPaged">["items"][number];
type ReceiptSnapshot = TRPCQueryOutput<"receipts.get">;

const applyPagedUpdate = (
	item: PagedReceiptSnapshot,
	update: TRPCMutationInput<"receipts.update">["update"]
): PagedReceiptSnapshot => {
	switch (update.type) {
		case "name":
			return { ...item, name: update.name };
		case "issued":
			return { ...item, issued: update.issued };
		case "locked":
			return { ...item, locked: update.value };
		case "currency":
			return { ...item, currency: update.currency };
	}
};

const applyUpdate = (
	item: ReceiptSnapshot,
	update: TRPCMutationInput<"receipts.update">["update"]
): ReceiptSnapshot => {
	switch (update.type) {
		case "name":
			return { ...item, name: update.name };
		case "issued":
			return { ...item, issued: update.issued };
		case "locked":
			return { ...item, locked: update.value };
		case "currency":
			return { ...item, currency: update.currency };
	}
};

const getRevert =
	(
		snapshot: ReceiptSnapshot,
		update: TRPCMutationInput<"receipts.update">["update"]
	): Revert<ReceiptSnapshot> =>
	(receipt) => {
		switch (update.type) {
			case "name":
				return { ...receipt, name: snapshot.name };
			case "issued":
				return { ...receipt, issued: snapshot.issued };
			case "locked":
				return { ...receipt, resolved: snapshot.locked };
			case "currency":
				return { ...receipt, currency: snapshot.currency };
		}
	};

const getPagedRevert =
	(
		snapshot: PagedReceiptSnapshot,
		update: TRPCMutationInput<"receipts.update">["update"]
	): Revert<PagedReceiptSnapshot> =>
	(receipt) => {
		switch (update.type) {
			case "name":
				return { ...receipt, name: snapshot.name };
			case "issued":
				return { ...receipt, issued: snapshot.issued };
			case "locked":
				return { ...receipt, locked: snapshot.locked };
			case "currency":
				return { ...receipt, currency: snapshot.currency };
		}
	};

export const mutationOptions: UseContextedMutationOptions<
	"receipts.update",
	{
		pagedRevert?: Revert<PagedReceiptSnapshot>;
		revert?: Revert<ReceiptSnapshot>;
	}
> = {
	onMutate: (trpcContext) => (updateObject) => {
		const pagedSnapshot = cache.receipts.getPaged.update(
			trpcContext,
			updateObject.id,
			(receipt) => applyPagedUpdate(receipt, updateObject.update)
		);
		const snapshot = cache.receipts.get.update(
			trpcContext,
			updateObject.id,
			(receipt) => applyUpdate(receipt, updateObject.update)
		);
		return {
			pagedSnapshot:
				pagedSnapshot && getPagedRevert(pagedSnapshot, updateObject.update),
			revert: snapshot && getRevert(snapshot, updateObject.update),
		};
	},
	onSuccess: (trpcContext) => (_result, updateObject) => {
		if (updateObject.update.type === "locked" && !updateObject.update.value) {
			cache.debts.getReceipt.invalidate(trpcContext, updateObject.id);
		}
	},
	onError:
		(trpcContext) =>
		(_error, variables, { pagedRevert, revert } = {}) => {
			if (pagedRevert) {
				cache.receipts.getPaged.update(trpcContext, variables.id, pagedRevert);
			}
			if (revert) {
				cache.receipts.get.update(trpcContext, variables.id, revert);
			}
		},
};
