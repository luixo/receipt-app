import React from "react";

import { DateInput } from "~app/components/date-input";
import { useTrpcMutationOptions } from "~app/hooks/use-trpc-mutation-options";
import { trpc } from "~app/trpc";
import type { ReceiptsId } from "~db/models";
import { options as receiptsUpdateOptions } from "~mutations/receipts/update";

type Props = {
	receiptId: ReceiptsId;
	issued: Date;
	receiptLocked: boolean;
	isOwner: boolean;
	isLoading: boolean;
};

export const ReceiptDateInput: React.FC<Props> = ({
	receiptId,
	issued,
	receiptLocked,
	isOwner,
	isLoading,
}) => {
	const updateReceiptMutation = trpc.receipts.update.useMutation(
		useTrpcMutationOptions(receiptsUpdateOptions),
	);

	const saveDate = React.useCallback(
		(nextDate: Date) => {
			// TODO: add date-fns comparison of dates
			if (nextDate.valueOf() === issued.valueOf()) {
				return;
			}
			updateReceiptMutation.mutate({
				id: receiptId,
				update: { type: "issued", issued: nextDate },
			});
		},
		[updateReceiptMutation, receiptId, issued],
	);

	return (
		<DateInput
			mutation={updateReceiptMutation}
			timestamp={issued}
			labelPlacement="outside-left"
			isDisabled={!isOwner || receiptLocked || isLoading}
			onUpdate={saveDate}
		/>
	);
};
