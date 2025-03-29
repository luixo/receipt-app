import type React from "react";

import { z } from "zod";

import { useTrpcMutationOptions } from "~app/hooks/use-trpc-mutation-options";
import type { TRPCQueryOutput } from "~app/trpc";
import { trpc } from "~app/trpc";
import { useAppForm } from "~app/utils/forms";
import { receiptNameSchema } from "~app/utils/validation";
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
	const updateReceiptMutation = trpc.receipts.update.useMutation(
		useTrpcMutationOptions(receiptsUpdateOptions, {
			onSuccess: unsetEditing,
		}),
	);
	const form = useAppForm({
		defaultValues: { value: receipt.name },
		validators: { onChange: z.object({ value: receiptNameSchema }) },
		onSubmit: ({ value }) => {
			if (value.value === receipt.name) {
				unsetEditing();
				return;
			}
			updateReceiptMutation.mutate({
				id: receipt.id,
				update: { type: "name", name: value.value },
			});
		},
	});

	return (
		<form.AppField name="value">
			{(field) => (
				<field.TextField
					value={field.state.value}
					onValueChange={field.setValue}
					name={field.name}
					onBlur={field.handleBlur}
					fieldError={field.state.meta.errors}
					aria-label="Receipt name"
					mutation={updateReceiptMutation}
					labelPlacement="outside-left"
					className="basis-36"
					isDisabled={isLoading}
					isReadOnly={receipt.ownerUserId !== receipt.selfUserId}
					saveProps={{
						title: "Save receipt name",
						onPress: () => {
							void field.form.handleSubmit();
						},
					}}
				/>
			)}
		</form.AppField>
	);
};
