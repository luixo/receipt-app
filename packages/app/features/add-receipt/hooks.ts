import React from "react";

import type {
	useActionHooks as useActionHooksRaw,
	useGetReceiptContext,
} from "~app/features/receipt/hooks";
import type { EmptyMutateOptions } from "~app/utils/queries";
import type { PeerId, ReceiptId, ReceiptItemId } from "~db/ids";

import type { Form, Item, Participant, Payer } from "./state";

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
type SetPayers = (
	setStateAction: React.SetStateAction<Payer[]>,
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
						consumers: [],
						payers: [],
						createdAt: Temporal.Now.zonedDateTimeISO(),
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
			itemId: ReceiptItemId,
			setStateAction: React.SetStateAction<Partial<Item>>,
			options: EmptyMutateOptions | undefined,
		) => {
			setItems((prevItems) => {
				const index = prevItems.findIndex((item) => item.id === itemId);
				if (index === -1) {
					return prevItems;
				}
				// oxlint-disable-next-line typescript/no-non-null-assertion
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
		(itemId, peerId, part, options) =>
			updateItem(
				itemId,
				(prevItem) => ({
					// Remove accidentally added double participants
					consumers: [
						...(prevItem.consumers || []).filter(
							({ peerId: lookupPeerId }) => lookupPeerId !== peerId,
						),
						{ peerId, part, createdAt: Temporal.Now.zonedDateTimeISO() },
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
		(itemId, peerId, options) =>
			updateItem(
				itemId,
				(prevItem) => ({
					consumers: (prevItem.consumers || []).filter(
						({ peerId: lookupPeerId }) => lookupPeerId !== peerId,
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
		(itemId, peerId, part, options) =>
			updateItem(
				itemId,
				(prevItem) => {
					const prevConsumers = prevItem.consumers || [];
					const matchedPartIndex = prevConsumers.findIndex(
						({ peerId: lookupPeerId }) => peerId === lookupPeerId,
					);
					if (matchedPartIndex === -1) {
						return {};
					}
					return {
						consumers: [
							...prevConsumers.slice(0, matchedPartIndex),
							// oxlint-disable-next-line typescript/no-non-null-assertion
							{ ...prevConsumers[matchedPartIndex]!, part },
							...prevConsumers.slice(matchedPartIndex + 1),
						],
					};
				},
				options,
			),
		[updateItem],
	);
};

const useAddItemPayer = (setItems: SetItems) => {
	const updateItem = useUpdateItem(setItems);
	return React.useCallback<ActionsHooks["addItemPayer"]>(
		(itemId, peerId, part, options) =>
			updateItem(
				itemId,
				(prevItem) => ({
					// Remove accidentally added double participants
					payers: [
						...(prevItem.payers || []).filter(
							({ peerId: lookupPeerId }) => lookupPeerId !== peerId,
						),
						{ peerId, part, createdAt: Temporal.Now.zonedDateTimeISO() },
					],
				}),
				options,
			),
		[updateItem],
	);
};

const useRemoveItemPayer = (setItems: SetItems) => {
	const updateItem = useUpdateItem(setItems);
	return React.useCallback<ActionsHooks["removeItemPayer"]>(
		(itemId, peerId, options) =>
			updateItem(
				itemId,
				(prevItem) => ({
					payers: (prevItem.payers || []).filter(
						({ peerId: lookupPeerId }) => lookupPeerId !== peerId,
					),
				}),
				options,
			),
		[updateItem],
	);
};

const useUpdateItemPayerPart = (setItems: SetItems) => {
	const updateItem = useUpdateItem(setItems);
	return React.useCallback<ActionsHooks["updateItemPayerPart"]>(
		(itemId, peerId, part, options) =>
			updateItem(
				itemId,
				(prevItem) => {
					const prevPayers = prevItem.payers || [];
					const matchedPartIndex = prevPayers.findIndex(
						({ peerId: lookupPeerId }) => peerId === lookupPeerId,
					);
					if (matchedPartIndex === -1) {
						return {};
					}
					return {
						payers: [
							...prevPayers.slice(0, matchedPartIndex),
							// oxlint-disable-next-line typescript/no-non-null-assertion
							{ ...prevPayers[matchedPartIndex]!, part },
							...prevPayers.slice(matchedPartIndex + 1),
						],
					};
				},
				options,
			),
		[updateItem],
	);
};

const useAddPayer = (setPayers: SetPayers) =>
	React.useCallback<ActionsHooks["addPayer"]>(
		(peerId, part, options) =>
			setPayers(
				(prevPayers) => [
					// Remove accidentally added double participants
					...prevPayers.filter((payer) => payer.peerId !== peerId),
					{ createdAt: Temporal.Now.zonedDateTimeISO(), peerId, part },
				],
				options,
			),
		[setPayers],
	);

const useRemovePayer = (setPayers: SetPayers) =>
	React.useCallback<ActionsHooks["removePayer"]>(
		(peerId, options) =>
			setPayers(
				(prevPayers) => prevPayers.filter((payer) => payer.peerId !== peerId),
				options,
			),
		[setPayers],
	);

const useUpdatePayers = (setPayers: SetPayers) =>
	React.useCallback(
		(
			options: EmptyMutateOptions | undefined,
			peerId: PeerId,
			setStateAction: React.SetStateAction<Partial<Payer>>,
		) => {
			setPayers((prevPayers) => {
				const index = prevPayers.findIndex((payer) => payer.peerId === peerId);
				if (index === -1) {
					return prevPayers;
				}
				// oxlint-disable-next-line typescript/no-non-null-assertion
				const prevPayer = prevPayers[index]!;
				const nextPayerPartial =
					typeof setStateAction === "function"
						? setStateAction(prevPayer)
						: setStateAction;
				return [
					...prevPayers.slice(0, index),
					{ ...prevPayer, ...nextPayerPartial },
					...prevPayers.slice(index + 1),
				];
			}, options);
		},
		[setPayers],
	);

const useUpdatePayerPart = (setPayers: SetPayers) => {
	const updatePayer = useUpdatePayers(setPayers);
	return React.useCallback<ActionsHooks["updatePayerPart"]>(
		(peerId, part, options) => updatePayer(options, peerId, { part }),
		[updatePayer],
	);
};

const useAddParticipant = (setParticipants: SetParticipants) =>
	React.useCallback<ActionsHooks["addParticipant"]>(
		(peerId, role, options) =>
			setParticipants(
				(prevParticipants) => [
					// Remove accidentally added double participants
					...prevParticipants.filter(
						(participant) => participant.peerId !== peerId,
					),
					{ createdAt: Temporal.Now.zonedDateTimeISO(), role, peerId },
				],
				options,
			),
		[setParticipants],
	);

const useRemoveParticipant = (setParticipants: SetParticipants) =>
	React.useCallback<ActionsHooks["removeParticipant"]>(
		(peerId, options) =>
			setParticipants(
				(prevParticipants) =>
					prevParticipants.filter(
						(participant) => participant.peerId !== peerId,
					),
				options,
			),
		[setParticipants],
	);

const useUpdateParticipant = (setParticipants: SetParticipants) =>
	React.useCallback(
		(
			options: EmptyMutateOptions | undefined,
			peerId: PeerId,
			setStateAction: React.SetStateAction<Partial<Participant>>,
		) => {
			setParticipants((prevParticipants) => {
				const index = prevParticipants.findIndex(
					(participant) => participant.peerId === peerId,
				);
				if (index === -1) {
					return prevParticipants;
				}
				// oxlint-disable-next-line typescript/no-non-null-assertion
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
		(peerId, role, options) => updateParticipant(options, peerId, { role }),
		[updateParticipant],
	);
};

export const useActionsHooks = (
	setRawItems: React.Dispatch<React.SetStateAction<Item[]>>,
	setRawParticipants: React.Dispatch<React.SetStateAction<Participant[]>>,
	setRawPayers: React.Dispatch<React.SetStateAction<Payer[]>>,
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
	const setPayers = React.useCallback<SetPayers>(
		(setStateAction, options = {}) => {
			try {
				setRawPayers(setStateAction);
				options.onSettled?.();
				options.onSuccess?.();
			} catch {
				options.onError?.();
			}
		},
		[setRawPayers],
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
		addItemPayer: useAddItemPayer(setItems),
		removeItemPayer: useRemoveItemPayer(setItems),
		updateItemPayerPart: useUpdateItemPayerPart(setItems),
		addParticipant: useAddParticipant(setParticipants),
		removeParticipant: useRemoveParticipant(setParticipants),
		updateParticipantRole: useUpdateParticipantRole(setParticipants),
		addPayer: useAddPayer(setPayers),
		removePayer: useRemovePayer(setPayers),
		updatePayerPart: useUpdatePayerPart(setPayers),
	};
};

export const useAddReceiptContext = (
	form: Partial<Form>,
	receiptId: ReceiptId,
	selfPeerId: PeerId,
	payers: ReceiptContext["payers"],
	items: ReceiptContext["items"],
	participants: ReceiptContext["participants"],
): ReceiptContext => ({
	receiptId,
	selfPeerId,
	ownerPeerId: selfPeerId,
	payers,
	currencyCode: form.currencyCode ?? "???",
	receiptDisabled: false,
	items,
	participants,
	renderParticipantActions: () => null,
	getPeersSuggestOptions: () => undefined,
	emptyReceiptElement: null,
});
