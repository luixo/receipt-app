import React from "react";

import { Input } from "@nextui-org/react";
import { IoCheckmarkCircleOutline as CheckMark } from "react-icons/io5";

import { cache } from "app/cache";
import { IconButton } from "app/components/icon-button";
import { useAsyncCallback } from "app/hooks/use-async-callback";
import { useSingleInput } from "app/hooks/use-single-input";
import { useTrpcMutationOptions } from "app/hooks/use-trpc-mutation-options";
import { trpc } from "app/trpc";
import { receiptNameSchema } from "app/utils/validation";
import { ReceiptsId } from "next-app/db/models";
import { Role } from "next-app/handlers/receipts/utils";

type Props = {
	receipt: {
		name: string;
		id: ReceiptsId;
		role: Role;
	};
	isLoading: boolean;
};

export const ReceiptNameInput: React.FC<Props> = ({ receipt, isLoading }) => {
	const {
		bindings,
		state: inputState,
		getValue,
		setValue,
	} = useSingleInput({
		initialValue: receipt.name,
		schema: receiptNameSchema,
	});

	const updateReceiptMutation = trpc.useMutation(
		"receipts.update",
		useTrpcMutationOptions(cache.receipts.update.mutationOptions)
	);
	const saveName = useAsyncCallback(
		async (isMount, nextName: string) => {
			await updateReceiptMutation.mutateAsync({
				id: receipt.id,
				update: { type: "name", name: nextName },
			});
			if (!isMount()) {
				return;
			}
			setValue(nextName);
		},
		[updateReceiptMutation, receipt.id]
	);

	return (
		<Input
			{...bindings}
			aria-label="Receipt name"
			css={{ flex: 1, ml: "$8" }}
			disabled={updateReceiptMutation.isLoading || isLoading}
			readOnly={receipt.role !== "owner"}
			status={inputState.error ? "warning" : undefined}
			helperColor={inputState.error ? "warning" : "error"}
			helperText={
				inputState.error?.message || updateReceiptMutation.error?.message
			}
			contentRightStyling={updateReceiptMutation.isLoading}
			contentRight={
				<IconButton
					title="Save receipt name"
					light
					isLoading={updateReceiptMutation.isLoading}
					disabled={receipt.name === getValue() || Boolean(inputState.error)}
					onClick={() => saveName(getValue())}
					icon={<CheckMark size={24} />}
				/>
			}
		/>
	);
};
