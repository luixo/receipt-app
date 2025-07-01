import React from "react";

import { useMutation } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";

import { RemoveButton } from "~app/components/remove-button";
import { useNavigate } from "~app/hooks/use-navigation";
import { useTrpcMutationOptions } from "~app/hooks/use-trpc-mutation-options";
import type { TRPCQueryOutput } from "~app/trpc";
import { useTRPC } from "~app/utils/trpc";
import { options as receiptsRemoveOptions } from "~mutations/receipts/remove";

type Props = {
	receipt: TRPCQueryOutput<"receipts.get">;
	setLoading: (nextLoading: boolean) => void;
} & Omit<React.ComponentProps<typeof RemoveButton>, "mutation" | "onRemove">;

export const ReceiptRemoveButton: React.FC<Props> = ({
	receipt,
	setLoading,
	...props
}) => {
	const { t } = useTranslation("receipts");
	const trpc = useTRPC();
	const navigate = useNavigate();
	const removeReceiptMutation = useMutation(
		trpc.receipts.remove.mutationOptions(
			useTrpcMutationOptions(receiptsRemoveOptions, {
				onSuccess: () => navigate({ to: "/receipts", replace: true }),
			}),
		),
	);
	React.useEffect(
		() => setLoading(removeReceiptMutation.isPending),
		[removeReceiptMutation.isPending, setLoading],
	);
	const removeReceipt = React.useCallback(
		() => removeReceiptMutation.mutate({ id: receipt.id }),
		[removeReceiptMutation, receipt.id],
	);

	return (
		<RemoveButton
			mutation={removeReceiptMutation}
			onRemove={removeReceipt}
			subtitle={t("receipt.removeButton.confirmSubtitle")}
			noConfirm={receipt.items.length === 0}
			{...props}
		>
			{t("receipt.removeButton.text")}
		</RemoveButton>
	);
};
