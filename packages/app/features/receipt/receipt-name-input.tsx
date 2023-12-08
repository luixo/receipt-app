import React from "react";

import { Input } from "app/components/base/input";
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

	return (
		<Input
			{...bindings}
			aria-label="Receipt name"
			mutation={updateReceiptMutation}
			labelPlacement="outside-left"
			className="basis-36"
			isDisabled={isLoading}
			isReadOnly={receipt.role !== "owner"}
			fieldError={inputState.error}
			saveProps={{
				title: "Save receipt name",
				onClick: () => saveName(getValue()),
			}}
		/>
	);
};
