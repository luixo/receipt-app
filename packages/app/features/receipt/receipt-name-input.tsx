import React from "react";

import { Input } from "@nextui-org/react";
import { Button } from "@nextui-org/react-tailwind";
import { IoCheckmarkCircleOutline as CheckMark } from "react-icons/io5";

import { useSingleInput } from "app/hooks/use-single-input";
import { useTrpcMutationOptions } from "app/hooks/use-trpc-mutation-options";
import { mutations } from "app/mutations";
import { trpc } from "app/trpc";
import { receiptNameSchema } from "app/utils/validation";
import type { ReceiptsId } from "next-app/db/models";
import type { Role } from "next-app/handlers/receipts/utils";

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
		useTrpcMutationOptions(mutations.receipts.update.options, {
			onSuccess: unsetEditing,
		}),
	);
	const saveName = React.useCallback(
		(nextName: string) => {
			if (receipt.name === nextName) {
				unsetEditing();
				return;
			}
			updateReceiptMutation.mutate(
				{ id: receipt.id, update: { type: "name", name: nextName } },
				{ onSuccess: () => setValue(nextName) },
			);
		},
		[updateReceiptMutation, receipt.id, receipt.name, setValue, unsetEditing],
	);
	const isNameSync = receipt.name === getValue();

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
			contentRightStyling={false}
			contentRight={
				<Button
					title="Save receipt name"
					variant="light"
					isLoading={updateReceiptMutation.isLoading}
					isDisabled={Boolean(inputState.error)}
					onClick={() => saveName(getValue())}
					color={isNameSync ? "success" : "warning"}
					isIconOnly
				>
					<CheckMark size={24} />
				</Button>
			}
		/>
	);
};
