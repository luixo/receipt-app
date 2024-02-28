import React from "react";

import { useSingleInput } from "~app/hooks/use-single-input";
import { useTrpcMutationOptions } from "~app/hooks/use-trpc-mutation-options";
import { mutations } from "~app/mutations";
import { trpc } from "~app/trpc";
import { receiptNameSchema } from "~app/utils/validation";
import { Input } from "~components";
import type { ReceiptsId } from "~web/db/models";

type Props = {
	receiptId: ReceiptsId;
	receiptName: string;
	isOwner: boolean;
	isLoading: boolean;
	unsetEditing: () => void;
};

export const ReceiptNameInput: React.FC<Props> = ({
	receiptId,
	receiptName,
	isOwner,
	isLoading,
	unsetEditing,
}) => {
	const {
		bindings,
		state: inputState,
		getValue,
		setValue,
	} = useSingleInput({
		initialValue: receiptName,
		schema: receiptNameSchema,
	});

	const updateReceiptMutation = trpc.receipts.update.useMutation(
		useTrpcMutationOptions(mutations.receipts.update.options, {
			onSuccess: unsetEditing,
		}),
	);
	const saveName = React.useCallback(
		(nextName: string) => {
			if (receiptName === nextName) {
				unsetEditing();
				return;
			}
			updateReceiptMutation.mutate(
				{ id: receiptId, update: { type: "name", name: nextName } },
				{ onSuccess: () => setValue(nextName) },
			);
		},
		[updateReceiptMutation, receiptId, receiptName, setValue, unsetEditing],
	);

	return (
		<Input
			{...bindings}
			aria-label="Receipt name"
			mutation={updateReceiptMutation}
			labelPlacement="outside-left"
			className="basis-36"
			isDisabled={isLoading}
			isReadOnly={!isOwner}
			fieldError={inputState.error}
			saveProps={{
				title: "Save receipt name",
				onClick: () => saveName(getValue()),
			}}
		/>
	);
};
