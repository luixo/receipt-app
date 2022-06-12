import React from "react";
import { TextLink } from "../utils/styles";
import { trpc, TRPCQueryOutput } from "../trpc";
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
	getReceiptById,
	ReceiptsGetPagedInput,
	updateReceipts,
} from "../utils/queries/receipts";
import { useRouter } from "solito/router";
import { Text } from "../utils/styles";

type Receipt = TRPCQueryOutput<"receipts.get-paged">[number];

const deleteMutationOptions: UseContextedMutationOptions<
	"receipts.delete",
	{ pageIndex: number; receiptIndex: number; receipt: Receipt },
	ReceiptsGetPagedInput
> = {
	onMutate:
		(trpc, input) =>
		({ id }) => {
			const removedReceiptInfo = getReceiptById(trpc, input, id);
			updateReceipts(trpc, input, (receiptPage) =>
				receiptPage.filter((receipt) => receipt.id !== id)
			);
			return removedReceiptInfo;
		},
	onError: (trpc, input) => (_error, _variables, removedReceiptInfo) => {
		if (!removedReceiptInfo) {
			return;
		}
		updateReceipts(trpc, input, (receiptPage, pageIndex) => {
			if (pageIndex !== removedReceiptInfo.pageIndex) {
				return receiptPage;
			}
			return [
				...receiptPage.slice(0, removedReceiptInfo.receiptIndex),
				removedReceiptInfo.receipt,
				...receiptPage.slice(removedReceiptInfo.receiptIndex),
			];
		});
	},
};

type Props = {
	data: TRPCQueryOutput<"receipts.get">;
	input: ReceiptsGetPagedInput;
};

export const Receipt: React.FC<Props> = ({ data: receipt, input }) => {
	const router = useRouter();
	const deleteReceiptMutation = trpc.useMutation(
		"receipts.delete",
		useTrpcMutationOptions(deleteMutationOptions, input)
	);
	const ownerQuery = trpc.useQuery([
		"users.get",
		{ accountId: receipt.ownerAccountId },
	]);
	const deleteReceipt = React.useCallback(async () => {
		await deleteReceiptMutation.mutateAsync({ id: receipt.id });
		router.replace("/receipts");
	}, [deleteReceiptMutation, receipt.id]);
	return (
		<Block>
			<TextLink href={`/receipts/${receipt.id}/`}>{receipt.name}</TextLink>
			<Text>Currency: {receipt.currency}</Text>
			<Text>Sum: {receipt.sum}</Text>
			<Text>Role: {receipt.role}</Text>
			<QueryWrapper query={ownerQuery}>{ReceiptOwner}</QueryWrapper>
			{receipt.role === "owner" ? (
				<>
					<RemoveButton onPress={deleteReceipt}>Remove receipt</RemoveButton>
					<MutationWrapper<"receipts.delete"> mutation={deleteReceiptMutation}>
						{() => <Text>Remove success!</Text>}
					</MutationWrapper>
				</>
			) : null}
		</Block>
	);
};
