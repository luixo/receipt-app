import React from "react";

import { EmptyCard } from "~app/components/empty-card";
import type { Item, Participant } from "~app/features/receipt-components/state";
import { useParticipants } from "~app/hooks/use-participants";
import { useTrpcMutationOptions } from "~app/hooks/use-trpc-mutation-options";
import type { TRPCQueryInput, TRPCQueryOutput } from "~app/trpc";
import { trpc } from "~app/trpc";
import type { CurrencyCode } from "~app/utils/currency";
import type { EmptyMutateOptions } from "~app/utils/queries";
import type {
	AccountsId,
	ReceiptItemsId,
	ReceiptsId,
	UsersId,
} from "~db/models";
import { options as itemParticipantsAddOptions } from "~mutations/item-participants/add";
import { options as itemParticipantsRemoveOptions } from "~mutations/item-participants/remove";
import { options as itemParticipantsUpdateOptions } from "~mutations/item-participants/update";
import { options as receiptItemsAddOptions } from "~mutations/receipt-items/add";
import { options as receiptItemsRemoveOptions } from "~mutations/receipt-items/remove";
import { options as receiptItemsUpdateOptions } from "~mutations/receipt-items/update";
import { options as receiptParticipantsAddOptions } from "~mutations/receipt-participants/add";
import { options as receiptParticipantsRemoveOptions } from "~mutations/receipt-participants/remove";
import { options as receiptParticipantsUpdateOptions } from "~mutations/receipt-participants/update";
import type { AssignableRole, Role } from "~web/handlers/receipts/utils";

const useSelfAccountId = () =>
	trpc.account.get.useQuery().data?.account.id ??
	("unknown-account-id" as AccountsId);

const useAddParticipant = (receiptId: ReceiptsId) => {
	const selfAccountId = useSelfAccountId();
	const addParticipantMutation = trpc.receiptParticipants.add.useMutation(
		useTrpcMutationOptions(receiptParticipantsAddOptions, {
			context: { receiptId, selfAccountId },
		}),
	);
	return React.useCallback(
		(userId: UsersId, role: AssignableRole, options: EmptyMutateOptions = {}) =>
			addParticipantMutation.mutate({ receiptId, userId, role }, options),
		[addParticipantMutation, receiptId],
	);
};

const useRemoveParticipant = (receiptId: ReceiptsId) => {
	const removeReceiptParticipantMutation =
		trpc.receiptParticipants.remove.useMutation(
			useTrpcMutationOptions(receiptParticipantsRemoveOptions, {
				context: { receiptId },
			}),
		);
	return React.useCallback(
		(userId: UsersId, options: EmptyMutateOptions = {}) =>
			removeReceiptParticipantMutation.mutate({ receiptId, userId }, options),
		[removeReceiptParticipantMutation, receiptId],
	);
};

const useUpdateParticipantRole = (
	receiptId: ReceiptsId,
	selfUserId: UsersId,
) => {
	const updateParticipantMutation = trpc.receiptParticipants.update.useMutation(
		useTrpcMutationOptions(receiptParticipantsUpdateOptions, {
			context: { selfUserId },
		}),
	);
	return React.useCallback(
		(
			userId: UsersId,
			nextRole: Exclude<Role, "owner">,
			options: EmptyMutateOptions = {},
		) =>
			updateParticipantMutation.mutate(
				{ receiptId, userId, update: { type: "role", role: nextRole } },
				options,
			),
		[updateParticipantMutation, receiptId],
	);
};

const useAddItem = (receiptId: ReceiptsId) => {
	const addItemMutation = trpc.receiptItems.add.useMutation(
		useTrpcMutationOptions(receiptItemsAddOptions, {
			context: receiptId,
		}),
	);
	return React.useCallback(
		(
			name: string,
			price: number,
			quantity: number,
			options: EmptyMutateOptions = {},
		) => addItemMutation.mutate({ name, price, quantity, receiptId }, options),
		[addItemMutation, receiptId],
	);
};

const useRemoveItem = (receiptId: ReceiptsId) => {
	const removeReceiptItemMutation = trpc.receiptItems.remove.useMutation(
		useTrpcMutationOptions(receiptItemsRemoveOptions, {
			context: receiptId,
		}),
	);
	return React.useCallback(
		(itemId: ReceiptItemsId, options: EmptyMutateOptions = {}) =>
			removeReceiptItemMutation.mutate({ id: itemId }, options),
		[removeReceiptItemMutation],
	);
};

const useUpdateItemName = (receiptId: ReceiptsId) => {
	const updateMutation = trpc.receiptItems.update.useMutation(
		useTrpcMutationOptions(receiptItemsUpdateOptions, {
			context: receiptId,
		}),
	);
	return React.useCallback(
		(itemId: ReceiptItemsId, name: string, options: EmptyMutateOptions = {}) =>
			updateMutation.mutate(
				{ id: itemId, update: { type: "name", name } },
				options,
			),
		[updateMutation],
	);
};

const useUpdateItemPrice = (receiptId: ReceiptsId) => {
	const updateMutation = trpc.receiptItems.update.useMutation(
		useTrpcMutationOptions(receiptItemsUpdateOptions, {
			context: receiptId,
		}),
	);
	return React.useCallback(
		(itemId: ReceiptItemsId, price: number, options: EmptyMutateOptions = {}) =>
			updateMutation.mutate(
				{ id: itemId, update: { type: "price", price } },
				options,
			),
		[updateMutation],
	);
};

const useUpdateItemQuantity = (receiptId: ReceiptsId) => {
	const updateMutation = trpc.receiptItems.update.useMutation(
		useTrpcMutationOptions(receiptItemsUpdateOptions, {
			context: receiptId,
		}),
	);
	return React.useCallback(
		(
			itemId: ReceiptItemsId,
			quantity: number,
			options: EmptyMutateOptions = {},
		) =>
			updateMutation.mutate(
				{ id: itemId, update: { type: "quantity", quantity } },
				options,
			),
		[updateMutation],
	);
};

const useAddItemPart = (receiptId: ReceiptsId) => {
	const addItemPartMutation = trpc.itemParticipants.add.useMutation(
		useTrpcMutationOptions(itemParticipantsAddOptions, {
			context: receiptId,
		}),
	);
	return React.useCallback(
		(
			itemId: ReceiptItemsId,
			userId: UsersId,
			part: number,
			options: EmptyMutateOptions = {},
		) => addItemPartMutation.mutate({ itemId, userId, part }, options),
		[addItemPartMutation],
	);
};

const useRemoveItemPart = (receiptId: ReceiptsId) => {
	const removeItemPartMutation = trpc.itemParticipants.remove.useMutation(
		useTrpcMutationOptions(itemParticipantsRemoveOptions, {
			context: receiptId,
		}),
	);
	return React.useCallback(
		(
			itemId: ReceiptItemsId,
			userId: UsersId,
			options: EmptyMutateOptions = {},
		) => removeItemPartMutation.mutate({ itemId, userId }, options),
		[removeItemPartMutation],
	);
};

const useUpdateItemPart = (receiptId: ReceiptsId) => {
	const updateItemPartMutation = trpc.itemParticipants.update.useMutation(
		useTrpcMutationOptions(itemParticipantsUpdateOptions, {
			context: receiptId,
		}),
	);
	return React.useCallback(
		(
			itemId: ReceiptItemsId,
			userId: UsersId,
			part: number,
			options: EmptyMutateOptions = {},
		) =>
			updateItemPartMutation.mutate(
				{ itemId, userId, update: { type: "part", part } },
				options,
			),
		[updateItemPartMutation],
	);
};

export const useActionHooks = (receipt: TRPCQueryOutput<"receipts.get">) => ({
	addItem: useAddItem(receipt.id),
	removeItem: useRemoveItem(receipt.id),
	updateItemName: useUpdateItemName(receipt.id),
	updateItemPrice: useUpdateItemPrice(receipt.id),
	updateItemQuantity: useUpdateItemQuantity(receipt.id),
	addItemPart: useAddItemPart(receipt.id),
	removeItemPart: useRemoveItemPart(receipt.id),
	updateItemPart: useUpdateItemPart(receipt.id),
	addParticipant: useAddParticipant(receipt.id),
	removeParticipant: useRemoveParticipant(receipt.id),
	updateParticipantRole: useUpdateParticipantRole(
		receipt.id,
		receipt.selfUserId,
	),
});

export type ReceiptContext = {
	receiptId: ReceiptsId;
	currencyCode: CurrencyCode;
	selfUserId: UsersId;
	ownerUserId: UsersId;

	receiptDisabled: boolean;
	participantsDisabled: boolean;

	items: Item[];
	participants: Participant[];

	renderParticipantActions: (
		participant: ReturnType<typeof useParticipants>["participants"][number],
	) => React.ReactNode;
	getUsersSuggestOptions: () => TRPCQueryInput<"users.suggest">["options"];
	emptyReceiptElement: React.ReactNode;
};

export const useGetReceiptContext = (
	receipt: TRPCQueryOutput<"receipts.get">,
	receiptDisabled: boolean,
	renderParticipantActions: ReceiptContext["renderParticipantActions"],
): ReceiptContext => {
	const { participants } = useParticipants(receipt);
	return {
		receiptId: receipt.id,
		selfUserId: receipt.selfUserId,
		ownerUserId: receipt.ownerUserId,
		currencyCode: receipt.currencyCode,
		receiptDisabled,
		participantsDisabled: Boolean(receipt.transferIntentionUserId),
		items: receipt.items,
		participants,
		renderParticipantActions,
		getUsersSuggestOptions: () => ({
			type: "not-connected-receipt",
			receiptId: receipt.id,
		}),
		emptyReceiptElement: (
			<EmptyCard title="You have no receipt items yet">
				Press a button above to add a receipt item
			</EmptyCard>
		),
	};
};
