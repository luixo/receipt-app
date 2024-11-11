import React from "react";

import { type UseFormReturn } from "react-hook-form";

import type {
	useActionHooks as useActionHooksRaw,
	useGetReceiptContext,
} from "~app/features/receipt/hooks";
import type { EmptyMutateOptions } from "~app/utils/queries";
import type { ReceiptItemsId, ReceiptsId, UsersId } from "~db/models";

import type { Form, Item, Participant } from "./state";

type ActionsHooks = ReturnType<typeof useActionHooksRaw>;
type ReceiptContext = ReturnType<typeof useGetReceiptContext>;

type SetItems = (
	setStateAction: React.SetStateAction<Item[]>,
	options: EmptyMutateOptions | undefined,
) => void;
type SetParticipants = (
	setStateAction: React.SetStateAction<Participant[]>,
	options: EmptyMutateOptions | undefined,
) => void;

const useAddItem = (setItems: SetItems) =>
	React.useCallback<ActionsHooks["addItem"]>(
		(name, price, quantity, options) =>
			setItems(
				(prevItems) => [
					...prevItems,
					{
						id: `temp-${Math.random()}`,
						name,
						price,
						quantity,
						parts: [],
						createdAt: new Date(),
					},
				],
				options,
			),
		[setItems],
	);

const useRemoveItem = (setItems: SetItems) =>
	React.useCallback<ActionsHooks["removeItem"]>(
		(itemId, options) =>
			setItems(
				(prevItems) => prevItems.filter((item) => item.id !== itemId),
				options,
			),
		[setItems],
	);

const useUpdateItem = (setItems: SetItems) =>
	React.useCallback(
		(
			itemId: ReceiptItemsId,
			setStateAction: React.SetStateAction<Partial<Item>>,
			options: EmptyMutateOptions | undefined,
		) => {
			setItems((prevItems) => {
				const index = prevItems.findIndex((item) => item.id === itemId);
				if (index === -1) {
					return prevItems;
				}
				// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
				const prevItem = prevItems[index]!;
				const nextItemPartial =
					typeof setStateAction === "function"
						? setStateAction(prevItem)
						: setStateAction;
				return [
					...prevItems.slice(0, index),
					{ ...prevItem, ...nextItemPartial },
					...prevItems.slice(index + 1),
				];
			}, options);
		},
		[setItems],
	);

const useUpdateItemName = (setItems: SetItems) => {
	const updateItem = useUpdateItem(setItems);
	return React.useCallback<ActionsHooks["updateItemName"]>(
		(itemId, name, options) => updateItem(itemId, { name }, options),
		[updateItem],
	);
};

const useUpdateItemPrice = (setItems: SetItems) => {
	const updateItem = useUpdateItem(setItems);
	return React.useCallback<ActionsHooks["updateItemPrice"]>(
		(itemId, price, options) => updateItem(itemId, { price }, options),
		[updateItem],
	);
};

const useUpdateItemQuantity = (setItems: SetItems) => {
	const updateItem = useUpdateItem(setItems);
	return React.useCallback<ActionsHooks["updateItemQuantity"]>(
		(itemId, quantity, options) => updateItem(itemId, { quantity }, options),
		[updateItem],
	);
};

const useAddItemConsumer = (setItems: SetItems) => {
	const updateItem = useUpdateItem(setItems);
	return React.useCallback<ActionsHooks["addItemConsumer"]>(
		(itemId, userId, part, options) =>
			updateItem(
				itemId,
				(prevItem) => ({
					// Remove accidentally added double participants
					parts: [
						...(prevItem.parts || []).filter(
							({ userId: lookupUserId }) => lookupUserId !== userId,
						),
						{ userId, part },
					],
				}),
				options,
			),
		[updateItem],
	);
};

const useRemoveItemConsumer = (setItems: SetItems) => {
	const updateItem = useUpdateItem(setItems);
	return React.useCallback<ActionsHooks["removeItemConsumer"]>(
		(itemId, userId, options) =>
			updateItem(
				itemId,
				(prevItem) => ({
					parts: (prevItem.parts || []).filter(
						({ userId: lookupUserId }) => lookupUserId !== userId,
					),
				}),
				options,
			),
		[updateItem],
	);
};

const useUpdateItemConsumerPart = (setItems: SetItems) => {
	const updateItem = useUpdateItem(setItems);
	return React.useCallback<ActionsHooks["updateItemConsumerPart"]>(
		(itemId, userId, part, options) =>
			updateItem(
				itemId,
				(prevItem) => {
					const prevParts = prevItem.parts || [];
					const matchedPartIndex = prevParts.findIndex(
						({ userId: lookupUserId }) => userId === lookupUserId,
					);
					if (matchedPartIndex === -1) {
						return {};
					}
					return {
						parts: [
							...prevParts.slice(0, matchedPartIndex),
							// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
							{ ...prevParts[matchedPartIndex]!, part },
							...prevParts.slice(matchedPartIndex + 1),
						],
					};
				},
				options,
			),
		[updateItem],
	);
};

const useAddParticipant = (setParticipants: SetParticipants) =>
	React.useCallback<ActionsHooks["addParticipant"]>(
		(userId, role, options) =>
			setParticipants(
				(prevParticipants) => [
					// Remove accidentally added double participants
					...prevParticipants.filter(
						(participant) => participant.userId !== userId,
					),
					{ createdAt: new Date(), role, userId },
				],
				options,
			),
		[setParticipants],
	);

const useRemoveParticipant = (setParticipants: SetParticipants) =>
	React.useCallback<ActionsHooks["removeParticipant"]>(
		(userId, options) =>
			setParticipants(
				(prevParticipants) =>
					prevParticipants.filter(
						(participant) => participant.userId !== userId,
					),
				options,
			),
		[setParticipants],
	);

const useUpdateParticipant = (setParticipants: SetParticipants) =>
	React.useCallback(
		(
			options: EmptyMutateOptions | undefined,
			userId: UsersId,
			setStateAction: React.SetStateAction<Partial<Participant>>,
		) => {
			setParticipants((prevParticipants) => {
				const index = prevParticipants.findIndex(
					(participant) => participant.userId === userId,
				);
				if (index === -1) {
					return prevParticipants;
				}
				// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
				const prevParticipant = prevParticipants[index]!;
				const nextParticipantPartial =
					typeof setStateAction === "function"
						? setStateAction(prevParticipant)
						: setStateAction;
				return [
					...prevParticipants.slice(0, index),
					{ ...prevParticipant, ...nextParticipantPartial },
					...prevParticipants.slice(index + 1),
				];
			}, options);
		},
		[setParticipants],
	);

const useUpdateParticipantRole = (setParticipants: SetParticipants) => {
	const updateParticipant = useUpdateParticipant(setParticipants);
	return React.useCallback<ActionsHooks["updateParticipantRole"]>(
		(userId, role, options) => updateParticipant(options, userId, { role }),
		[updateParticipant],
	);
};

export const useActionsHooks = (
	setRawItems: React.Dispatch<React.SetStateAction<Item[]>>,
	setRawParticipants: React.Dispatch<React.SetStateAction<Participant[]>>,
): ActionsHooks => {
	const setItems = React.useCallback<SetItems>(
		(setStateAction, options = {}) => {
			try {
				setRawItems(setStateAction);
				options.onSettled?.();
				options.onSuccess?.();
			} catch {
				options.onError?.();
			}
		},
		[setRawItems],
	);
	const setParticipants = React.useCallback<SetParticipants>(
		(setStateAction, options = {}) => {
			try {
				setRawParticipants(setStateAction);
				options.onSettled?.();
				options.onSuccess?.();
			} catch {
				options.onError?.();
			}
		},
		[setRawParticipants],
	);
	return {
		addItem: useAddItem(setItems),
		removeItem: useRemoveItem(setItems),
		updateItemName: useUpdateItemName(setItems),
		updateItemPrice: useUpdateItemPrice(setItems),
		updateItemQuantity: useUpdateItemQuantity(setItems),
		addItemConsumer: useAddItemConsumer(setItems),
		removeItemConsumer: useRemoveItemConsumer(setItems),
		updateItemConsumerPart: useUpdateItemConsumerPart(setItems),
		addParticipant: useAddParticipant(setParticipants),
		removeParticipant: useRemoveParticipant(setParticipants),
		updateParticipantRole: useUpdateParticipantRole(setParticipants),
	};
};

export const useAddReceiptContext = (
	form: UseFormReturn<Form>,
	receiptId: ReceiptsId,
	selfUserId: UsersId,
	items: ReceiptContext["items"],
	participants: ReceiptContext["participants"],
): ReceiptContext => ({
	receiptId,
	selfUserId,
	ownerUserId: selfUserId,
	currencyCode: form.watch("currencyCode"),
	participantsDisabled: false,
	receiptDisabled: false,
	items,
	participants,
	renderParticipantActions: () => null,
	getUsersSuggestOptions: () => undefined,
	emptyReceiptElement: null,
});
