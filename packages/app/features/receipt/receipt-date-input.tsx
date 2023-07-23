import React from "react";

import { DateInput } from "app/components/date-input";
import { useTrpcMutationOptions } from "app/hooks/use-trpc-mutation-options";
import { mutations } from "app/mutations";
import { trpc, TRPCQueryOutput } from "app/trpc";

type Props = {
	receipt: TRPCQueryOutput<"receipts.get">;
	isLoading: boolean;
};

export const ReceiptDateInput: React.FC<Props> = ({
	receipt,
	isLoading: isOuterLoading,
}) => {
	const updateReceiptMutation = trpc.receipts.update.useMutation(
		useTrpcMutationOptions(mutations.receipts.update.options),
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
		[updateReceiptMutation, receipt.id, receipt.issued],
	);

	return (
		<DateInput
			loading={updateReceiptMutation.isLoading}
			error={updateReceiptMutation.error}
			timestamp={receipt.issued}
			disabled={receipt.role !== "owner" || receipt.locked || isOuterLoading}
			onUpdate={saveDate}
		/>
	);
};
