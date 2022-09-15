import React from "react";

import { Input } from "@nextui-org/react";
import { IoCheckmarkCircleOutline as CheckMark } from "react-icons/io5";

import { IconButton } from "app/components/icon-button";
import { useAsyncCallback } from "app/hooks/use-async-callback";
import { useSingleInput } from "app/hooks/use-single-input";
import { useTrpcMutationOptions } from "app/hooks/use-trpc-mutation-options";
import { mutations } from "app/mutations";
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
	unsetEditing: () => void;
};

export const ReceiptNameInput: React.FC<Props> = ({
	receipt,
	isLoading,
	unsetEditing,
}) => {
	const {
		bindings,
		state: inputState,
		getValue,
		setValue,
	} = useSingleInput({
		initialValue: receipt.name,
		schema: receiptNameSchema,
	});

	const updateReceiptMutation = trpc.receipts.update.useMutation(
		useTrpcMutationOptions(mutations.receipts.update.options)
	);
	const saveName = useAsyncCallback(
		async (isMount, nextName: string) => {
			if (receipt.name !== nextName) {
				await updateReceiptMutation.mutateAsync({
					id: receipt.id,
					update: { type: "name", name: nextName },
				});
			}
			if (!isMount()) {
				return;
			}
			setValue(nextName);
			unsetEditing();
		},
		[updateReceiptMutation, receipt.id, receipt.name, setValue, unsetEditing]
	);

	return (
		<Input
			{...bindings}
			aria-label="Receipt name"
			css={{ flex: 1 }}
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
					disabled={Boolean(inputState.error)}
					onClick={() => saveName(getValue())}
					icon={<CheckMark size={24} />}
				/>
			}
		/>
	);
};
