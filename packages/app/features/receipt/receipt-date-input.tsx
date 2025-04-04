import React from "react";

import { DateInput } from "~app/components/date-input";
import { useTrpcMutationOptions } from "~app/hooks/use-trpc-mutation-options";
import type { TRPCQueryOutput } from "~app/trpc";
import { trpc } from "~app/trpc";
import { options as receiptsUpdateOptions } from "~mutations/receipts/update";

type Props = {
	receipt: TRPCQueryOutput<"receipts.get">;
	isLoading: boolean;
};

export const ReceiptDateInput: React.FC<Props> = ({
	receipt,
	isLoading: isDisabled,
}) => {
	const updateReceiptMutation = trpc.receipts.update.useMutation(
		useTrpcMutationOptions(receiptsUpdateOptions),
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
			value={receipt.issued}
			onValueChange={saveDate}
			mutation={updateReceiptMutation}
			labelPlacement="outside-left"
			isDisabled={receipt.ownerUserId !== receipt.selfUserId || isDisabled}
		/>
	);
};
