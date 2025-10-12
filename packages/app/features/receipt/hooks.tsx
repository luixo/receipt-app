import React from "react";

import { useMutation } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";

import { EmptyCard } from "~app/components/empty-card";
import type {
	Item,
	Participant,
	Payer,
} from "~app/features/receipt-components/state";
import { useParticipants } from "~app/hooks/use-participants";
import { useTrpcMutationOptions } from "~app/hooks/use-trpc-mutation-options";
import type { TRPCQueryInput, TRPCQueryOutput } from "~app/trpc";
import type { CurrencyCode } from "~app/utils/currency";
import type { EmptyMutateOptions } from "~app/utils/queries";
import { useTRPC } from "~app/utils/trpc";
import type { ReceiptId, ReceiptItemId, UserId } from "~db/ids";
import { options as receiptItemConsumersAddOptions } from "~mutations/receipt-item-consumers/add";
import { options as receiptItemConsumersRemoveOptions } from "~mutations/receipt-item-consumers/remove";
import { options as receiptItemConsumersUpdateOptions } from "~mutations/receipt-item-consumers/update";
import { options as receiptItemPayersAddOptions } from "~mutations/receipt-item-payers/add";
import { options as receiptItemPayersRemoveOptions } from "~mutations/receipt-item-payers/remove";
import { options as receiptItemPayersUpdateOptions } from "~mutations/receipt-item-payers/update";
import { options as receiptItemsAddOptions } from "~mutations/receipt-items/add";
import { options as receiptItemsRemoveOptions } from "~mutations/receipt-items/remove";
import { options as receiptItemsUpdateOptions } from "~mutations/receipt-items/update";
import { options as receiptParticipantsAddOptions } from "~mutations/receipt-participants/add";
import { options as receiptParticipantsRemoveOptions } from "~mutations/receipt-participants/remove";
import { options as receiptParticipantsUpdateOptions } from "~mutations/receipt-participants/update";
import type { AssignableRole, Role } from "~web/handlers/receipts/utils";

const useAddParticipant = (receiptId: ReceiptId) => {
	const trpc = useTRPC();
	const addParticipantMutation = useMutation(
		trpc.receiptParticipants.add.mutationOptions(
			useTrpcMutationOptions(receiptParticipantsAddOptions),
		),
	);
	return React.useCallback(
		(userId: UserId, role: AssignableRole, options: EmptyMutateOptions = {}) =>
			addParticipantMutation.mutate({ receiptId, userId, role }, options),
		[addParticipantMutation, receiptId],
	);
};

const useRemoveParticipant = (receiptId: ReceiptId) => {
	const trpc = useTRPC();
	const removeReceiptParticipantMutation = useMutation(
		trpc.receiptParticipants.remove.mutationOptions(
			useTrpcMutationOptions(receiptParticipantsRemoveOptions),
		),
	);
	return React.useCallback(
		(userId: UserId, options: EmptyMutateOptions = {}) =>
			removeReceiptParticipantMutation.mutate({ receiptId, userId }, options),
		[removeReceiptParticipantMutation, receiptId],
	);
};

const useUpdateParticipantRole = (receiptId: ReceiptId) => {
	const trpc = useTRPC();
	const updateParticipantMutation = useMutation(
		trpc.receiptParticipants.update.mutationOptions(
			useTrpcMutationOptions(receiptParticipantsUpdateOptions),
		),
	);
	return React.useCallback(
		(
			userId: UserId,
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

const useAddPayer = (receiptId: ReceiptId) => {
	const trpc = useTRPC();
	const addPayerMutation = useMutation(
		trpc.receiptItemConsumers.add.mutationOptions(
			useTrpcMutationOptions(receiptItemConsumersAddOptions, {
				context: { receiptId },
			}),
		),
	);
	return React.useCallback(
		(userId: UserId, part: number, options: EmptyMutateOptions = {}) =>
			addPayerMutation.mutate({ itemId: receiptId, userId, part }, options),
		[addPayerMutation, receiptId],
	);
};

const useRemovePayer = (receiptId: ReceiptId) => {
	const trpc = useTRPC();
	const removePayerMutation = useMutation(
		trpc.receiptItemConsumers.remove.mutationOptions(
			useTrpcMutationOptions(receiptItemConsumersRemoveOptions, {
				context: { receiptId },
			}),
		),
	);
	return React.useCallback(
		(userId: UserId, options: EmptyMutateOptions = {}) =>
			removePayerMutation.mutate({ itemId: receiptId, userId }, options),
		[removePayerMutation, receiptId],
	);
};

const useUpdatePayerPart = (receiptId: ReceiptId) => {
	const trpc = useTRPC();
	const updateParticipantMutation = useMutation(
		trpc.receiptItemConsumers.update.mutationOptions(
			useTrpcMutationOptions(receiptItemConsumersUpdateOptions, {
				context: { receiptId },
			}),
		),
	);
	return React.useCallback(
		(userId: UserId, nextPart: number, options: EmptyMutateOptions = {}) =>
			updateParticipantMutation.mutate(
				{ itemId: receiptId, userId, update: { type: "part", part: nextPart } },
				options,
			),
		[updateParticipantMutation, receiptId],
	);
};

const useAddItem = (receiptId: ReceiptId) => {
	const trpc = useTRPC();
	const addItemMutation = useMutation(
		trpc.receiptItems.add.mutationOptions(
			useTrpcMutationOptions(receiptItemsAddOptions),
		),
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

const useRemoveItem = (receiptId: ReceiptId) => {
	const trpc = useTRPC();
	const removeReceiptItemMutation = useMutation(
		trpc.receiptItems.remove.mutationOptions(
			useTrpcMutationOptions(receiptItemsRemoveOptions, {
				context: { receiptId },
			}),
		),
	);
	return React.useCallback(
		(itemId: ReceiptItemId, options: EmptyMutateOptions = {}) =>
			removeReceiptItemMutation.mutate({ id: itemId }, options),
		[removeReceiptItemMutation],
	);
};

const useUpdateItemName = (receiptId: ReceiptId) => {
	const trpc = useTRPC();
	const updateMutation = useMutation(
		trpc.receiptItems.update.mutationOptions(
			useTrpcMutationOptions(receiptItemsUpdateOptions, {
				context: { receiptId },
			}),
		),
	);
	return React.useCallback(
		(itemId: ReceiptItemId, name: string, options: EmptyMutateOptions = {}) =>
			updateMutation.mutate(
				{ id: itemId, update: { type: "name", name } },
				options,
			),
		[updateMutation],
	);
};

const useUpdateItemPrice = (receiptId: ReceiptId) => {
	const trpc = useTRPC();
	const updateMutation = useMutation(
		trpc.receiptItems.update.mutationOptions(
			useTrpcMutationOptions(receiptItemsUpdateOptions, {
				context: { receiptId },
			}),
		),
	);
	return React.useCallback(
		(itemId: ReceiptItemId, price: number, options: EmptyMutateOptions = {}) =>
			updateMutation.mutate(
				{ id: itemId, update: { type: "price", price } },
				options,
			),
		[updateMutation],
	);
};

const useUpdateItemQuantity = (receiptId: ReceiptId) => {
	const trpc = useTRPC();
	const updateMutation = useMutation(
		trpc.receiptItems.update.mutationOptions(
			useTrpcMutationOptions(receiptItemsUpdateOptions, {
				context: { receiptId },
			}),
		),
	);
	return React.useCallback(
		(
			itemId: ReceiptItemId,
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

const useAddItemConsumer = (receiptId: ReceiptId) => {
	const trpc = useTRPC();
	const addItemConsumerMutation = useMutation(
		trpc.receiptItemConsumers.add.mutationOptions(
			useTrpcMutationOptions(receiptItemConsumersAddOptions, {
				context: { receiptId },
			}),
		),
	);
	return React.useCallback(
		(
			itemId: ReceiptItemId,
			userId: UserId,
			part: number,
			options: EmptyMutateOptions = {},
		) => addItemConsumerMutation.mutate({ itemId, userId, part }, options),
		[addItemConsumerMutation],
	);
};

const useRemoveItemConsumer = (receiptId: ReceiptId) => {
	const trpc = useTRPC();
	const removeItemConsumerMutation = useMutation(
		trpc.receiptItemConsumers.remove.mutationOptions(
			useTrpcMutationOptions(receiptItemConsumersRemoveOptions, {
				context: { receiptId },
			}),
		),
	);
	return React.useCallback(
		(itemId: ReceiptItemId, userId: UserId, options: EmptyMutateOptions = {}) =>
			removeItemConsumerMutation.mutate({ itemId, userId }, options),
		[removeItemConsumerMutation],
	);
};

const useUpdateItemConsumerPart = (receiptId: ReceiptId) => {
	const trpc = useTRPC();
	const updateItemConsumerMutation = useMutation(
		trpc.receiptItemConsumers.update.mutationOptions(
			useTrpcMutationOptions(receiptItemConsumersUpdateOptions, {
				context: { receiptId },
			}),
		),
	);
	return React.useCallback(
		(
			itemId: ReceiptItemId,
			userId: UserId,
			part: number,
			options: EmptyMutateOptions = {},
		) =>
			updateItemConsumerMutation.mutate(
				{ itemId, userId, update: { type: "part", part } },
				options,
			),
		[updateItemConsumerMutation],
	);
};

const useAddItemPayer = (receiptId: ReceiptId) => {
	const trpc = useTRPC();
	const addItemPayerMutation = useMutation(
		trpc.receiptItemPayers.add.mutationOptions(
			useTrpcMutationOptions(receiptItemPayersAddOptions, {
				context: { receiptId },
			}),
		),
	);
	return React.useCallback(
		(
			itemId: ReceiptItemId,
			userId: UserId,
			part: number,
			options: EmptyMutateOptions = {},
		) => addItemPayerMutation.mutate({ itemId, userId, part }, options),
		[addItemPayerMutation],
	);
};

const useRemoveItemPayer = (receiptId: ReceiptId) => {
	const trpc = useTRPC();
	const removeItemPayerMutation = useMutation(
		trpc.receiptItemPayers.remove.mutationOptions(
			useTrpcMutationOptions(receiptItemPayersRemoveOptions, {
				context: { receiptId },
			}),
		),
	);
	return React.useCallback(
		(itemId: ReceiptItemId, userId: UserId, options: EmptyMutateOptions = {}) =>
			removeItemPayerMutation.mutate({ itemId, userId }, options),
		[removeItemPayerMutation],
	);
};

const useUpdateItemPayerPart = (receiptId: ReceiptId) => {
	const trpc = useTRPC();
	const updateItemPayerMutation = useMutation(
		trpc.receiptItemPayers.update.mutationOptions(
			useTrpcMutationOptions(receiptItemPayersUpdateOptions, {
				context: { receiptId },
			}),
		),
	);
	return React.useCallback(
		(
			itemId: ReceiptItemId,
			userId: UserId,
			part: number,
			options: EmptyMutateOptions = {},
		) =>
			updateItemPayerMutation.mutate(
				{ itemId, userId, update: { type: "part", part } },
				options,
			),
		[updateItemPayerMutation],
	);
};

export const useActionHooks = (receipt: TRPCQueryOutput<"receipts.get">) => ({
	addItem: useAddItem(receipt.id),
	removeItem: useRemoveItem(receipt.id),
	updateItemName: useUpdateItemName(receipt.id),
	updateItemPrice: useUpdateItemPrice(receipt.id),
	updateItemQuantity: useUpdateItemQuantity(receipt.id),
	addItemConsumer: useAddItemConsumer(receipt.id),
	removeItemConsumer: useRemoveItemConsumer(receipt.id),
	updateItemConsumerPart: useUpdateItemConsumerPart(receipt.id),
	addParticipant: useAddParticipant(receipt.id),
	removeParticipant: useRemoveParticipant(receipt.id),
	updateParticipantRole: useUpdateParticipantRole(receipt.id),
	addPayer: useAddPayer(receipt.id),
	removePayer: useRemovePayer(receipt.id),
	updatePayerPart: useUpdatePayerPart(receipt.id),
	addItemPayer: useAddItemPayer(receipt.id),
	removeItemPayer: useRemoveItemPayer(receipt.id),
	updateItemPayerPart: useUpdateItemPayerPart(receipt.id),
});

export type ReceiptContext = {
	receiptId: ReceiptId;
	currencyCode: CurrencyCode;
	selfUserId: UserId;
	ownerUserId: UserId;

	receiptDisabled: boolean;

	items: Item[];
	participants: Participant[];
	payers: Payer[];

	renderParticipantActions: (
		participant: ReturnType<typeof useParticipants>[number],
	) => React.ReactNode;
	getUsersSuggestOptions: () => TRPCQueryInput<"users.suggest">["options"];
	emptyReceiptElement: React.ReactNode;
};

export const useGetReceiptContext = (
	receipt: TRPCQueryOutput<"receipts.get">,
	receiptDisabled: boolean,
	renderParticipantActions: ReceiptContext["renderParticipantActions"],
): ReceiptContext => {
	const { t } = useTranslation("receipts");
	const participants = useParticipants(receipt);
	return {
		receiptId: receipt.id,
		selfUserId: receipt.selfUserId,
		payers: receipt.payers,
		ownerUserId: receipt.ownerUserId,
		currencyCode: receipt.currencyCode,
		receiptDisabled,
		items: receipt.items,
		participants,
		renderParticipantActions,
		getUsersSuggestOptions: () => ({
			type: "not-connected-receipt",
			receiptId: receipt.id,
		}),
		emptyReceiptElement: (
			<EmptyCard title={t("empty.items.title")}>
				{t("empty.items.message")}
			</EmptyCard>
		),
	};
};
