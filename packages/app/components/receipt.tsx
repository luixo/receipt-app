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
	getPagedReceiptById,
	ReceiptsGetPagedInput,
	updatePagedReceipts,
} from "../utils/queries/receipts-get-paged";
import { useRouter } from "solito/router";
import { Text } from "../utils/styles";
import { useAsyncCallback } from "../hooks/use-async-callback";
import {
	getReceiptById,
	ReceiptsGetInput,
	updateReceipt,
} from "../utils/queries/receipts-get";

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
