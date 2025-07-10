import React from "react";

import { useMutation } from "@tanstack/react-query";

import { DateInput } from "~app/components/date-input";
import { useTrpcMutationOptions } from "~app/hooks/use-trpc-mutation-options";
import type { TRPCQueryOutput } from "~app/trpc";
import { useTRPC } from "~app/utils/trpc";
import { options as receiptsUpdateOptions } from "~mutations/receipts/update";
import { areEqual } from "~utils/date";

type Props = {
	receipt: TRPCQueryOutput<"receipts.get">;
	isLoading: boolean;
};

export const ReceiptDateInput: React.FC<Props> = ({
	receipt,
	isLoading: isDisabled,
}) => {
	const trpc = useTRPC();
	const updateReceiptMutation = useMutation(
		trpc.receipts.update.mutationOptions(
			useTrpcMutationOptions(receiptsUpdateOptions),
		),
	);

	const saveDate = React.useCallback(
		(nextDate: Date) => {
			if (areEqual(nextDate, receipt.issued)) {
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
