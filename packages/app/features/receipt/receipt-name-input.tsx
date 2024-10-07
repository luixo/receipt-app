import React from "react";

import { useSingleInput } from "~app/hooks/use-single-input";
import { useTrpcMutationOptions } from "~app/hooks/use-trpc-mutation-options";
import type { TRPCQueryOutput } from "~app/trpc";
import { trpc } from "~app/trpc";
import { receiptNameSchema } from "~app/utils/validation";
import { Input } from "~components/input";
import { options as receiptsUpdateOptions } from "~mutations/receipts/update";

type Props = {
	receipt: TRPCQueryOutput<"receipts.get">;
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
		useTrpcMutationOptions(receiptsUpdateOptions, {
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
			isReadOnly={receipt.ownerUserId !== receipt.selfUserId}
			fieldError={inputState.error}
			saveProps={{
				title: "Save receipt name",
				onClick: () => saveName(getValue()),
			}}
		/>
	);
};
