import React from "react";
import * as ReactNative from "react-native";

import { useRouter } from "solito/router";

import { Block } from "app/components/utils/block";
import { MutationWrapper } from "app/components/utils/mutation-wrapper";
import { QueryWrapper } from "app/components/utils/query-wrapper";
import { RemoveButton } from "app/components/utils/remove-button";
import { useAsyncCallback } from "app/hooks/use-async-callback";
import {
	UseContextedMutationOptions,
	useTrpcMutationOptions,
} from "app/hooks/use-trpc-mutation-options";
import { trpc, TRPCMutationInput, TRPCQueryOutput } from "app/trpc";
import { Currency } from "app/utils/currency";
import {
	getReceiptById,
	ReceiptsGetInput,
	updateReceipt,
} from "app/utils/queries/receipts-get";
import {
	getPagedReceiptById,
	ReceiptsGetPagedInput,
	updatePagedReceipts,
} from "app/utils/queries/receipts-get-paged";
import { TextLink, Text } from "app/utils/styles";
import { VALIDATIONS_CONSTANTS } from "app/utils/validation";
import { UsersId } from "next-app/src/db/models";

import { ReceiptCurrencyChange } from "./receipt-currency-change";
import { ReceiptOwner } from "./receipt-owner";

type PagedReceiptSnapshot = TRPCQueryOutput<"receipts.get-paged">[number];
type ReceiptSnapshot = TRPCQueryOutput<"receipts.get">;

const deleteMutationOptions: UseContextedMutationOptions<
	"receipts.delete",
	{
		pagedSnapshot?: {
			pageIndex: number;
			receiptIndex: number;
			receipt: PagedReceiptSnapshot;
		};
		snapshot?: ReceiptSnapshot;
	},
	{
		pagedInput: ReceiptsGetPagedInput;
		input: ReceiptsGetInput;
	}
> = {
	onMutate:
		(trpcContext, { pagedInput, input }) =>
		({ id }) => {
			const pagedSnapshot = getPagedReceiptById(trpcContext, pagedInput, id);
			const snapshot = getReceiptById(trpcContext, input);
			updatePagedReceipts(trpcContext, pagedInput, (receiptPage) =>
				receiptPage.filter((receipt) => receipt.id !== id)
			);
			updateReceipt(trpcContext, input, () => undefined);
			return { pagedSnapshot, snapshot };
		},
	onError:
		(trpcContext, { pagedInput, input }) =>
		(_error, _variables, { pagedSnapshot, snapshot } = {}) => {
			if (pagedSnapshot) {
				updatePagedReceipts(
					trpcContext,
					pagedInput,
					(receiptPage, pageIndex) => {
						if (pageIndex !== pagedSnapshot.pageIndex) {
							return receiptPage;
						}
						return [
							...receiptPage.slice(0, pagedSnapshot.receiptIndex),
							pagedSnapshot.receipt,
							...receiptPage.slice(pagedSnapshot.receiptIndex),
						];
					}
				);
			}
			if (snapshot) {
				updateReceipt(trpcContext, input, () => snapshot);
			}
		},
};

const applyPagedUpdate = (
	item: PagedReceiptSnapshot,
	update: TRPCMutationInput<"receipts.update">["update"]
): PagedReceiptSnapshot => {
	switch (update.type) {
		case "name":
			return { ...item, name: update.name };
		case "issued":
			return { ...item, issued: update.issued };
		case "resolved":
			return { ...item, receiptResolved: update.resolved };
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
		case "resolved":
			return { ...item, resolved: update.resolved };
		case "currency":
			return { ...item, currency: update.currency };
	}
};

const updateMutationOptions: UseContextedMutationOptions<
	"receipts.update",
	{ pagedSnapshot?: PagedReceiptSnapshot; snapshot?: ReceiptSnapshot },
	{ pagedInput: ReceiptsGetPagedInput; input: ReceiptsGetInput }
> = {
	onMutate:
		(trpcContext, { pagedInput, input }) =>
		(updateObject) => {
			const pagedSnapshot = getPagedReceiptById(
				trpcContext,
				pagedInput,
				updateObject.id
			);
			updatePagedReceipts(trpcContext, pagedInput, (items) =>
				items.map((item) =>
					item.id === updateObject.id
						? applyPagedUpdate(item, updateObject.update)
						: item
				)
			);
			const snapshot = getReceiptById(trpcContext, input);
			updateReceipt(trpcContext, input, (receipt) =>
				applyUpdate({ ...receipt, dirty: true }, updateObject.update)
			);
			return {
				pagedSnapshot: pagedSnapshot?.receipt,
				snapshot,
			};
		},
	onSuccess:
		(trpcContext, { input }) =>
		() =>
			updateReceipt(trpcContext, input, (receipt) => ({
				...receipt,
				dirty: false,
			})),
	onError:
		(trpcContext, { pagedInput, input }) =>
		(_error, _variables, { pagedSnapshot, snapshot } = {}) => {
			if (pagedSnapshot) {
				updatePagedReceipts(trpcContext, pagedInput, (page) =>
					page.map((lookupReceipt) =>
						lookupReceipt.id === pagedSnapshot.id
							? pagedSnapshot
							: lookupReceipt
					)
				);
			}
			if (snapshot) {
				updateReceipt(trpcContext, input, () => snapshot);
			}
		},
};

type Props = {
	data: TRPCQueryOutput<"receipts.get">;
	pagedInput: ReceiptsGetPagedInput;
	input: ReceiptsGetInput;
};

export const Receipt: React.FC<Props> = ({
	data: receipt,
	pagedInput,
	input,
}) => {
	const router = useRouter();
	const deleteReceiptMutation = trpc.useMutation(
		"receipts.delete",
		useTrpcMutationOptions(deleteMutationOptions, { pagedInput, input })
	);
	const ownerQuery = trpc.useQuery([
		"users.get",
		// Typesystem doesn't know that we use account id as self user id
		{ id: receipt.ownerAccountId as UsersId },
	]);
	const deleteReceipt = useAsyncCallback(
		async (isMount) => {
			await deleteReceiptMutation.mutateAsync({ id: receipt.id });
			if (!isMount()) {
				return;
			}
			router.replace("/receipts");
		},
		[deleteReceiptMutation, receipt.id]
	);
	const [currenciesPickerShown, setCurrenciesPickerShown] =
		React.useState(false);
	const showCurrencyPicker = React.useCallback(
		() => setCurrenciesPickerShown(true),
		[setCurrenciesPickerShown]
	);
	const hideCurrencyPicker = React.useCallback(
		() => setCurrenciesPickerShown(false),
		[setCurrenciesPickerShown]
	);

	const updateReceiptMutation = trpc.useMutation(
		"receipts.update",
		useTrpcMutationOptions(updateMutationOptions, { pagedInput, input })
	);
	const promptName = React.useCallback(() => {
		const name = window.prompt("Please enter new name", receipt.name);
		if (
			!name ||
			name.length < VALIDATIONS_CONSTANTS.receiptName.min ||
			name.length > VALIDATIONS_CONSTANTS.receiptName.max
		) {
			return window.alert(
				`Name length should be between ${VALIDATIONS_CONSTANTS.receiptName.min} and ${VALIDATIONS_CONSTANTS.receiptName.max}!`
			);
		}
		if (name === receipt.name) {
			return;
		}
		updateReceiptMutation.mutate({
			id: receipt.id,
			update: { type: "name", name },
		});
	}, [updateReceiptMutation, receipt.id, receipt.name]);
	const promptIssued = React.useCallback(() => {
		const issued = window.prompt(
			"Please enter new issued date",
			receipt.issued.toISOString().slice(0, 10)
		);
		const maybeIssuedDate = new Date(issued || "");
		if (Number.isNaN(maybeIssuedDate.valueOf())) {
			return window.alert(`Improper date!`);
		}
		if (maybeIssuedDate.toDateString() === receipt.issued.toDateString()) {
			return;
		}
		updateReceiptMutation.mutate({
			id: receipt.id,
			update: { type: "issued", issued: maybeIssuedDate },
		});
	}, [updateReceiptMutation, receipt.id, receipt.issued]);
	const switchResolved = React.useCallback(() => {
		updateReceiptMutation.mutate({
			id: receipt.id,
			update: { type: "resolved", resolved: !receipt.resolved },
		});
	}, [updateReceiptMutation, receipt.id, receipt.resolved]);
	const changeCurrency = React.useCallback(
		(currency: Currency) => {
			updateReceiptMutation.mutate({
				id: receipt.id,
				update: { type: "currency", currency },
			});
		},
		[updateReceiptMutation, receipt.id]
	);

	return (
		<Block>
			<TextLink href={`/receipts/${receipt.id}/`}>{receipt.name}</TextLink>
			<ReactNative.TouchableOpacity
				disabled={receipt.role !== "owner" || receipt.dirty}
				onPress={promptName}
			>
				<Text>Change name</Text>
			</ReactNative.TouchableOpacity>
			<ReactNative.TouchableOpacity
				disabled={receipt.role === "viewer"}
				onPress={showCurrencyPicker}
			>
				<Text>Currency: {receipt.currency}</Text>
			</ReactNative.TouchableOpacity>
			{currenciesPickerShown ? (
				<ReceiptCurrencyChange
					close={hideCurrencyPicker}
					changeCurrency={changeCurrency}
					initialCurrency={receipt.currency}
					disabled={receipt.dirty}
				/>
			) : null}
			<Text>Sum: {receipt.sum}</Text>
			<Text>Role: {receipt.role}</Text>
			<ReactNative.TouchableOpacity
				disabled={receipt.role !== "owner" || receipt.dirty}
				onPress={promptIssued}
			>
				<Text>Issued: {receipt.issued.toLocaleDateString()}</Text>
			</ReactNative.TouchableOpacity>
			<ReactNative.TouchableOpacity
				disabled={receipt.role === "viewer" || receipt.dirty}
				onPress={switchResolved}
			>
				<Text>Resolved: {receipt.resolved.toString()}</Text>
			</ReactNative.TouchableOpacity>
			<QueryWrapper query={ownerQuery}>{ReceiptOwner}</QueryWrapper>
			{receipt.role === "owner" ? (
				<>
					<RemoveButton onPress={deleteReceipt} disabled={receipt.dirty}>
						Remove receipt
					</RemoveButton>
					<MutationWrapper<"receipts.delete"> mutation={deleteReceiptMutation}>
						{() => <Text>Remove success!</Text>}
					</MutationWrapper>
				</>
			) : null}
			<MutationWrapper<"receipts.update"> mutation={updateReceiptMutation}>
				{() => <Text>Update success!</Text>}
			</MutationWrapper>
		</Block>
	);
};
