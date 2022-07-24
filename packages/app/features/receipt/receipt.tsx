import React from "react";
import * as ReactNative from "react-native";

import { useRouter } from "solito/router";

import { cache, Cache } from "app/cache";
import { Block } from "app/components/block";
import { MutationWrapper } from "app/components/mutation-wrapper";
import { QueryWrapper } from "app/components/query-wrapper";
import { RemoveButton } from "app/components/remove-button";
import { useAsyncCallback } from "app/hooks/use-async-callback";
import {
	UseContextedMutationOptions,
	useTrpcMutationOptions,
} from "app/hooks/use-trpc-mutation-options";
import { trpc, TRPCQueryOutput } from "app/trpc";
import { Currency } from "app/utils/currency";
import { TextLink, Text } from "app/utils/styles";

import { ReceiptCurrencyChange } from "./receipt-currency-change";
import { ReceiptOwner } from "./receipt-owner";
import { updateMutationOptions } from "./update-mutation-options";

const deleteMutationOptions: UseContextedMutationOptions<
	"receipts.delete",
	{
		receiptSnapshot?: ReturnType<
			typeof cache["receipts"]["getPaged"]["remove"]
		>;
	},
	{
		pagedInput: Cache.Receipts.GetPaged.Input;
		input: Cache.Receipts.Get.Input;
	}
> = {
	onMutate:
		(trpcContext, { pagedInput }) =>
		({ id }) => ({
			receiptSnapshot: cache.receipts.getPaged.remove(
				trpcContext,
				pagedInput,
				(receipt) => receipt.id === id
			),
		}),
	onError:
		(trpcContext, { pagedInput }) =>
		(_error, _variables, { receiptSnapshot } = {}) => {
			if (receiptSnapshot) {
				cache.receipts.getPaged.add(trpcContext, pagedInput, receiptSnapshot);
			}
		},
	onSuccess:
		(trpcContext, { input }) =>
		() =>
			cache.receipts.get.remove(trpcContext, input),
};

type Props = {
	data: TRPCQueryOutput<"receipts.get">;
	input: Cache.Receipts.Get.Input;
};

export const Receipt: React.FC<Props> = ({ data: receipt, input }) => {
	const router = useRouter();
	const receiptsGetPagedInput = cache.receipts.getPaged.useStore();
	const deleteReceiptMutation = trpc.useMutation(
		"receipts.delete",
		useTrpcMutationOptions(deleteMutationOptions, {
			pagedInput: receiptsGetPagedInput,
			input,
		})
	);
	const ownerQuery = trpc.useQuery(["users.get", { id: receipt.ownerUserId }]);
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
		useTrpcMutationOptions(updateMutationOptions, {
			pagedInput: receiptsGetPagedInput,
			input,
		})
	);
	const promptName = React.useCallback(() => {
		const name = window.prompt("Please enter new name", receipt.name);
		if (!name) {
			return;
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
