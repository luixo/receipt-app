import React from "react";

import { Loading, styled, Text } from "@nextui-org/react";

import { cache } from "app/cache";
import { Calendar } from "app/components/calendar";
import { MutationErrorMessage } from "app/components/error-message";
import { useTrpcMutationOptions } from "app/hooks/use-trpc-mutation-options";
import { trpc, TRPCQueryOutput } from "app/trpc";

const DateText = styled(Text, {
	fontSize: "$sm",

	variants: {
		disabled: {
			false: {
				cursor: "pointer",
			},
		},
	},
});

type Props = {
	receipt: TRPCQueryOutput<"receipts.get">;
	isLoading: boolean;
};

export const ReceiptDateInput: React.FC<Props> = ({
	receipt,
	isLoading: isOuterLoading,
}) => {
	const updateReceiptMutation = trpc.useMutation(
		"receipts.update",
		useTrpcMutationOptions(cache.receipts.update.mutationOptions)
	);

	const saveDate = React.useCallback(
		(nextDate: Date) => {
			// TODO: add date-fns comparison of dates
			if (nextDate.valueOf() === receipt.issued.valueOf()) {
				return;
			}
			updateReceiptMutation.mutate({
				id: receipt.id,
				update: { type: "issued", issued: nextDate },
			});
		},
		[updateReceiptMutation, receipt.id, receipt.issued]
	);
	const isOwner = receipt.role === "owner";
	const isLoading = updateReceiptMutation.isLoading || isOuterLoading;
	const disabled = !isOwner || isLoading;

	return (
		<>
			{updateReceiptMutation.status === "error" ? (
				<MutationErrorMessage mutation={updateReceiptMutation} />
			) : null}
			<Calendar value={receipt.issued} onChange={saveDate} disabled={disabled}>
				<DateText disabled={disabled} css={{ color: "$accents7" }}>
					{updateReceiptMutation.isLoading ? (
						<Loading size="xs" />
					) : (
						// TODO: add formatting
						receipt.issued.toISOString().slice(0, 10)
					)}
				</DateText>
			</Calendar>
		</>
	);
};
