import { cache } from "app/cache";
import type { SnapshotFn, UpdateFn } from "app/cache/utils";
import type { UseContextedMutationOptions } from "app/hooks/use-trpc-mutation-options";
import type {
	TRPCMutationInput,
	TRPCMutationOutput,
	TRPCQueryOutput,
} from "app/trpc";

type PagedReceiptSnapshot =
	TRPCQueryOutput<"receipts.getPaged">["items"][number];
type ReceiptSnapshot = TRPCQueryOutput<"receipts.get">;

const applyPagedUpdate =
	(
		update: TRPCMutationInput<"receipts.update">["update"],
	): UpdateFn<PagedReceiptSnapshot> =>
	(item) => {
		// lockedTimestamp will be overriden in onSuccess
		const nextLockedTimestamp =
			item.lockedTimestamp === undefined ? undefined : new Date();
		switch (update.type) {
			case "name":
				return { ...item, name: update.name };
			case "issued":
				return { ...item, issued: update.issued };
			case "locked":
				return {
					...item,
					lockedTimestamp: update.locked ? nextLockedTimestamp : undefined,
				};
			case "currencyCode":
				return {
					...item,
					currencyCode: update.currencyCode,
					lockedTimestamp: nextLockedTimestamp,
				};
		}
	};

const applySuccessPagedUpdate =
	(
		update: TRPCMutationInput<"receipts.update">["update"],
		result: TRPCMutationOutput<"receipts.update">,
	): UpdateFn<PagedReceiptSnapshot> =>
	(item) => {
		switch (update.type) {
			case "locked":
			case "currencyCode":
				return {
					...item,
					lockedTimestamp: result.lockedTimestamp || undefined,
				};
			default:
				return item;
		}
	};

const applyUpdate =
	(
		update: TRPCMutationInput<"receipts.update">["update"],
	): UpdateFn<ReceiptSnapshot> =>
	(item) => {
		// lockedTimestamp will be overriden in onSuccess
		const nextLockedTimestamp =
			item.lockedTimestamp === undefined ? undefined : new Date();
		switch (update.type) {
			case "name":
				return { ...item, name: update.name };
			case "issued":
				return { ...item, issued: update.issued };
			case "locked":
				return {
					...item,
					lockedTimestamp: update.locked ? nextLockedTimestamp : undefined,
				};
			case "currencyCode":
				return {
					...item,
					currencyCode: update.currencyCode,
					lockedTimestamp: nextLockedTimestamp,
				};
		}
	};

const applySuccessUpdate =
	(
		update: TRPCMutationInput<"receipts.update">["update"],
		result: TRPCMutationOutput<"receipts.update">,
	): UpdateFn<ReceiptSnapshot> =>
	(item) => {
		switch (update.type) {
			case "currencyCode":
			case "locked":
				return {
					...item,
					lockedTimestamp: result.lockedTimestamp || undefined,
				};
			default:
				return item;
		}
	};

const getRevert =
	(
		update: TRPCMutationInput<"receipts.update">["update"],
	): SnapshotFn<ReceiptSnapshot> =>
	(snapshot) =>
	(receipt) => {
		switch (update.type) {
			case "name":
				return { ...receipt, name: snapshot.name };
			case "issued":
				return { ...receipt, issued: snapshot.issued };
			case "locked":
				return { ...receipt, lockedTimestamp: snapshot.lockedTimestamp };
			case "currencyCode":
				return { ...receipt, currencyCode: snapshot.currencyCode };
		}
	};

const getPagedRevert =
	(
		update: TRPCMutationInput<"receipts.update">["update"],
	): SnapshotFn<PagedReceiptSnapshot> =>
	(snapshot) =>
	(receipt) => {
		switch (update.type) {
			case "name":
				return { ...receipt, name: snapshot.name };
			case "issued":
				return { ...receipt, issued: snapshot.issued };
			case "locked":
				return { ...receipt, lockedTimestamp: snapshot.lockedTimestamp };
			case "currencyCode":
				return { ...receipt, currencyCode: snapshot.currencyCode };
		}
	};

export const options: UseContextedMutationOptions<"receipts.update"> = {
	onMutate: (controllerContext) => (updateObject) =>
		cache.receipts.updateRevert(controllerContext, {
			get: (controller) =>
				controller.update(
					updateObject.id,
					applyUpdate(updateObject.update),
					getRevert(updateObject.update),
				),
			getNonResolvedAmount: undefined,
			getPaged: (controller) =>
				controller.update(
					updateObject.id,
					applyPagedUpdate(updateObject.update),
					getPagedRevert(updateObject.update),
				),
			getName: (controller) => {
				if (updateObject.update.type === "name") {
					return controller.upsert(updateObject.id, updateObject.update.name);
				}
			},
			getResolvedParticipants: undefined,
		}),
	onSuccess: (controllerContext) => (result, updateObject) => {
		cache.receipts.update(controllerContext, {
			get: (controller) =>
				controller.update(
					updateObject.id,
					applySuccessUpdate(updateObject.update, result),
				),
			getNonResolvedAmount: undefined,
			getPaged: (controller) =>
				controller.update(
					updateObject.id,
					applySuccessPagedUpdate(updateObject.update, result),
				),
			getName: undefined,
			getResolvedParticipants: undefined,
		});
	},
	errorToastOptions: () => (error) => ({
		text: `Error updating receipt: ${error.message}`,
	}),
};
