import type React from "react";

import { useMutation } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { z } from "zod/v4";

import { useTrpcMutationOptions } from "~app/hooks/use-trpc-mutation-options";
import type { TRPCQueryOutput } from "~app/trpc";
import { useAppForm } from "~app/utils/forms";
import { useTRPC } from "~app/utils/trpc";
import { receiptNameSchema } from "~app/utils/validation";
import { SaveButton } from "~components/save-button";
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
	const { t } = useTranslation("receipts");
	const trpc = useTRPC();
	const updateReceiptMutation = useMutation(
		trpc.receipts.update.mutationOptions(
			useTrpcMutationOptions(receiptsUpdateOptions, {
				onSuccess: unsetEditing,
			}),
		),
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
					fieldError={
						field.state.meta.isDirty ? field.state.meta.errors : undefined
					}
					aria-label={t("receipt.form.name.label")}
					mutation={updateReceiptMutation}
					labelPlacement="outside-left"
					className="basis-36"
					isDisabled={isLoading}
					isReadOnly={receipt.ownerUserId !== receipt.selfUserId}
					endContent={
						receipt.ownerUserId !== receipt.selfUserId ? null : (
							<form.Subscribe selector={(state) => state.canSubmit}>
								{(canSubmit) => (
									<SaveButton
										title={t("receipt.form.name.saveButton")}
										onPress={() => {
											void field.form.handleSubmit();
										}}
										isLoading={updateReceiptMutation.isPending}
										isDisabled={isLoading || !canSubmit}
									/>
								)}
							</form.Subscribe>
						)
					}
				/>
			)}
		</form.AppField>
	);
};
