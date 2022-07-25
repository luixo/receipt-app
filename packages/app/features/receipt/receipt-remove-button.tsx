import React from "react";
import * as ReactNative from "react-native";

import { Button, Loading, Spacer } from "@nextui-org/react";
import { IoTrashBin as TrashBin } from "react-icons/io5";
import { useRouter } from "solito/router";

import { cache } from "app/cache";
import { useAsyncCallback } from "app/hooks/use-async-callback";
import { useTrpcMutationOptions } from "app/hooks/use-trpc-mutation-options";
import { trpc, TRPCQueryOutput } from "app/trpc";
import { styled, Text } from "app/utils/styles";

const RemoveButtons = styled(ReactNative.View)({
	marginTop: "sm",
	flexDirection: "row",
});

type Props = {
	receipt: TRPCQueryOutput<"receipts.get">;
	setLoading: (nextLoading: boolean) => void;
};

export const ReceiptRemoveButton: React.FC<Props> = ({
	receipt,
	setLoading,
}) => {
	const router = useRouter();
	const deleteReceiptMutation = trpc.useMutation(
		"receipts.delete",
		useTrpcMutationOptions(cache.receipts.delete.mutationOptions)
	);
	React.useEffect(
		() => setLoading(deleteReceiptMutation.isLoading),
		[deleteReceiptMutation.isLoading, setLoading]
	);
	const [showDeleteConfirmation, setShowDeleteConfimation] =
		React.useState(false);
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

	if (!showDeleteConfirmation) {
		return (
			<Button auto onClick={() => setShowDeleteConfimation(true)} color="error">
				<TrashBin size={24} />
				<Spacer x={0.5} />
				Remove receipt
			</Button>
		);
	}

	return (
		<>
			<Text>Are you sure?</Text>
			<RemoveButtons>
				<Button
					auto
					onClick={deleteReceipt}
					disabled={deleteReceiptMutation.isLoading}
					color="error"
				>
					{deleteReceiptMutation.isLoading ? (
						<Loading color="currentColor" size="sm" />
					) : (
						"Yes"
					)}
				</Button>
				<Spacer x={0.5} />
				<Button
					auto
					onClick={() => setShowDeleteConfimation(false)}
					disabled={deleteReceiptMutation.isLoading}
				>
					No
				</Button>
			</RemoveButtons>
			{deleteReceiptMutation.error ? (
				<Button color="error" onClick={() => deleteReceiptMutation.reset()}>
					{deleteReceiptMutation.error.message}
				</Button>
			) : null}
		</>
	);
};
