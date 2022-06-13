import React from "react";
import * as ReactNative from "react-native";
import { TextLink } from "../utils/styles";
import { trpc, TRPCMutationInput, TRPCQueryOutput } from "../trpc";
import { Block } from "./utils/block";
import { QueryWrapper } from "./utils/query-wrapper";
import { ReceiptOwner } from "./receipt-owner";
import { MutationWrapper } from "./utils/mutation-wrapper";
import { RemoveButton } from "./utils/remove-button";
import {
	UseContextedMutationOptions,
	useTrpcMutationOptions,
} from "../hooks/use-trpc-mutation-options";
import {
	getPagedReceiptById,
	ReceiptsGetPagedInput,
	updatePagedReceipts,
} from "../utils/queries/receipts-get-paged";
import { useRouter } from "solito/router";
import { Text } from "../utils/styles";
import { useAsyncCallback } from "../hooks/use-async-callback";
import { VALIDATIONS_CONSTANTS } from "../utils/validation";
import {
	getReceiptById,
	ReceiptsGetInput,
	updateReceipt,
} from "../utils/queries/receipts-get";
import { ReceiptCurrencyChange } from "./receipt-currency-change";
import { Currency } from "../utils/currency";

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
		(trpc, { pagedInput, input }) =>
		({ id }) => {
			const pagedSnapshot = getPagedReceiptById(trpc, pagedInput, id);
			const snapshot = getReceiptById(trpc, input);
			updatePagedReceipts(trpc, pagedInput, (receiptPage) =>
				receiptPage.filter((receipt) => receipt.id !== id)
			);
			updateReceipt(trpc, input, () => undefined);
			return { pagedSnapshot, snapshot };
		},
	onError:
		(trpc, { pagedInput, input }) =>
		(_error, _variables, { pagedSnapshot, snapshot } = {}) => {
			if (pagedSnapshot) {
				updatePagedReceipts(trpc, pagedInput, (receiptPage, pageIndex) => {
					if (pageIndex !== pagedSnapshot.pageIndex) {
						return receiptPage;
					}
					return [
						...receiptPage.slice(0, pagedSnapshot.receiptIndex),
						pagedSnapshot.receipt,
						...receiptPage.slice(pagedSnapshot.receiptIndex),
					];
				});
			}
			if (snapshot) {
				updateReceipt(trpc, input, () => snapshot);
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
		(trpc, { pagedInput, input }) =>
		(updateObject) => {
			const pagedSnapshot = getPagedReceiptById(
				trpc,
				pagedInput,
				updateObject.id
			);
			updatePagedReceipts(trpc, pagedInput, (items) =>
				items.map((item) =>
					item.id === updateObject.id
						? applyPagedUpdate(item, updateObject.update)
						: item
				)
			);
			const snapshot = getReceiptById(trpc, input);
			updateReceipt(trpc, input, (receipt) =>
				applyUpdate(receipt, updateObject.update)
			);
			return {
				pagedSnapshot: pagedSnapshot?.receipt,
				snapshot,
			};
		},
	onError:
		(trpc, { pagedInput, input }) =>
		(_error, _variables, { pagedSnapshot, snapshot } = {}) => {
			if (pagedSnapshot) {
				updatePagedReceipts(trpc, pagedInput, (page) =>
					page.map((lookupReceipt) =>
						lookupReceipt.id === pagedSnapshot.id
							? pagedSnapshot
							: lookupReceipt
					)
				);
			}
			if (snapshot) {
				updateReceipt(trpc, input, () => snapshot);
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
		{ accountId: receipt.ownerAccountId },
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
		if (!name || name.length < 2 || name.length > 255) {
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
		if (isNaN(maybeIssuedDate.valueOf())) {
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
				disabled={receipt.role !== "owner"}
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
				/>
			) : null}
			<Text>Sum: {receipt.sum}</Text>
			<Text>Role: {receipt.role}</Text>
			<ReactNative.TouchableOpacity
				disabled={receipt.role !== "owner"}
				onPress={promptIssued}
			>
				<Text>Issued: {receipt.issued.toLocaleDateString()}</Text>
			</ReactNative.TouchableOpacity>
			<ReactNative.TouchableOpacity
				disabled={receipt.role === "viewer"}
				onPress={switchResolved}
			>
				<Text>Resolved: {receipt.resolved.toString()}</Text>
			</ReactNative.TouchableOpacity>
			<QueryWrapper query={ownerQuery}>{ReceiptOwner}</QueryWrapper>
			{receipt.role === "owner" ? (
				<>
					<RemoveButton onPress={deleteReceipt}>Remove receipt</RemoveButton>
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
