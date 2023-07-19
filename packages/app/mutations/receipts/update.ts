import { cache } from "app/cache";
import { SnapshotFn, UpdateFn } from "app/cache/utils";
import { UseContextedMutationOptions } from "app/hooks/use-trpc-mutation-options";
import { TRPCMutationInput, TRPCQueryOutput } from "app/trpc";
import { noop } from "app/utils/utils";

type PagedReceiptSnapshot =
	TRPCQueryOutput<"receipts.getPaged">["items"][number];
type ReceiptSnapshot = TRPCQueryOutput<"receipts.get">;

const applyPagedUpdate =
	(
		update: TRPCMutationInput<"receipts.update">["update"]
	): UpdateFn<PagedReceiptSnapshot> =>
	(item) => {
		switch (update.type) {
			case "name":
				return { ...item, name: update.name };
			case "issued":
				return { ...item, issued: update.issued };
			case "locked":
				return { ...item, locked: update.value };
			case "currencyCode":
				return { ...item, currencyCode: update.currencyCode };
		}
	};

const applyUpdate =
	(
		update: TRPCMutationInput<"receipts.update">["update"]
	): UpdateFn<ReceiptSnapshot> =>
	(item) => {
		switch (update.type) {
			case "name":
				return { ...item, name: update.name };
			case "issued":
				return { ...item, issued: update.issued };
			case "locked":
				return { ...item, locked: update.value };
			case "currencyCode":
				return { ...item, currencyCode: update.currencyCode };
		}
	};

const getRevert =
	(
		update: TRPCMutationInput<"receipts.update">["update"]
	): SnapshotFn<ReceiptSnapshot> =>
	(snapshot) =>
	(receipt) => {
		switch (update.type) {
			case "name":
				return { ...receipt, name: snapshot.name };
			case "issued":
				return { ...receipt, issued: snapshot.issued };
			case "locked":
				return { ...receipt, resolved: snapshot.locked };
			case "currencyCode":
				return { ...receipt, currencyCode: snapshot.currencyCode };
		}
	};

const getPagedRevert =
	(
		update: TRPCMutationInput<"receipts.update">["update"]
	): SnapshotFn<PagedReceiptSnapshot> =>
	(snapshot) =>
	(receipt) => {
		switch (update.type) {
			case "name":
				return { ...receipt, name: snapshot.name };
			case "issued":
				return { ...receipt, issued: snapshot.issued };
			case "locked":
				return { ...receipt, locked: snapshot.locked };
			case "currencyCode":
				return { ...receipt, currencyCode: snapshot.currencyCode };
		}
	};

export const options: UseContextedMutationOptions<"receipts.update"> = {
	onMutate: (trpcContext) => (updateObject) =>
		cache.receipts.updateRevert(trpcContext, {
			get: (controller) =>
				controller.update(
					updateObject.id,
					applyUpdate(updateObject.update),
					getRevert(updateObject.update)
				),
			getNonResolvedAmount: noop,
			getPaged: (controller) =>
				controller.update(
					updateObject.id,
					applyPagedUpdate(updateObject.update),
					getPagedRevert(updateObject.update)
				),
			getName: (controller) => {
				if (updateObject.update.type === "name") {
					return controller.upsert(updateObject.id, updateObject.update.name);
				}
			},
			getResolvedParticipants: noop,
		}),
	onSuccess: (trpcContext) => (_result, updateObject) => {
		if (updateObject.update.type === "locked" && !updateObject.update.value) {
			cache.debts.update(trpcContext, {
				getReceipt: (controller) =>
					controller.updateAllInReceipt(updateObject.id, (participants) =>
						participants.map((participant) => ({
							...participant,
							status:
								participant.status === "sync" ? "unsync" : participant.status,
							intentionDirection: undefined,
							synced: false,
						}))
					),
				getByUsers: noop,
				getUser: noop,
				get: noop,
			});
		}
	},
	errorToastOptions: () => (error) => ({
		text: `Error updating receipt: ${error.message}`,
	}),
};
