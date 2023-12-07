import React from "react";

import { DateInput } from "app/components/date-input";
import { useTrpcMutationOptions } from "app/hooks/use-trpc-mutation-options";
import { mutations } from "app/mutations";
import type { TRPCQueryOutput } from "app/trpc";
import { trpc } from "app/trpc";

type Props = {
	receipt: TRPCQueryOutput<"receipts.get">;
	isLoading: boolean;
};

export const ReceiptDateInput: React.FC<Props> = ({ receipt, isLoading }) => {
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
			mutation={updateReceiptMutation}
			timestamp={receipt.issued}
			isDisabled={
				receipt.role !== "owner" ||
				Boolean(receipt.lockedTimestamp) ||
				isLoading
			}
			onUpdate={saveDate}
		/>
	);
};
