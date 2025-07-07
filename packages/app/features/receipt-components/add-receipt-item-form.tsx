import React from "react";
import { View } from "react-native";

import { useTranslation } from "react-i18next";
import { z } from "zod/v4";

import { useTrpcMutationState } from "~app/hooks/use-trpc-mutation-state";
import { useAppForm } from "~app/utils/forms";
import { useTRPC } from "~app/utils/trpc";
import {
	priceSchema,
	priceSchemaDecimal,
	quantitySchema,
	quantitySchemaDecimal,
	receiptItemNameSchema,
} from "~app/utils/validation";
import { Button } from "~components/button";

import { useActionsHooksContext, useReceiptContext } from "./context";

const formSchema = z.object({
	name: receiptItemNameSchema,
	price: priceSchema,
	quantity: quantitySchema,
});
type Form = z.infer<typeof formSchema>;

export const AddReceiptItemForm: React.FC = () => {
	const { t } = useTranslation("receipts");
	const { receiptId, receiptDisabled } = useReceiptContext();
	const { addItem } = useActionsHooksContext();
	const trpc = useTRPC();
	const addItemMutationState = useTrpcMutationState<"receiptItems.add">(
		trpc.receiptItems.add.mutationKey(),
		(vars) => vars.receiptId === receiptId,
	);
	const isPending = addItemMutationState?.status === "pending";
	const nameFieldRef = React.useRef<HTMLInputElement & HTMLTextAreaElement>(
		null,
	);

	const defaultValues: Partial<Form> = {
		name: "",
		quantity: 1,
	};
	const form = useAppForm({
		defaultValues: defaultValues as Form,
		validators: {
			onMount: formSchema,
			onChange: formSchema,
			onSubmit: formSchema,
		},
		onSubmit: ({ value }) => {
			addItem(value.name, value.price, value.quantity, {
				onSuccess: () => {
					form.reset(
						{ ...(defaultValues as Form), price: 0 },
						{ keepDefaultValues: true },
					);
					nameFieldRef.current?.focus();
				},
			});
		},
	});

	const isDisabled = receiptDisabled || isPending;

	return (
		<form.AppForm>
			<form.Form className="flex flex-col gap-4">
				<View className="flex-row gap-4">
					<form.AppField name="name">
						{(field) => (
							<field.TextField
								value={field.state.value}
								onValueChange={field.setValue}
								name={field.name}
								onBlur={field.handleBlur}
								label={t("item.form.name.label")}
								isRequired
								autoFocus
								fieldError={
									field.state.meta.isDirty ? field.state.meta.errors : undefined
								}
								mutation={addItemMutationState}
								ref={nameFieldRef}
							/>
						)}
					</form.AppField>
					<form.AppField name="price">
						{(field) => (
							<field.NumberField
								value={field.state.value}
								onValueChange={field.setValue}
								name={field.name}
								onBlur={field.handleBlur}
								isRequired
								minValue={0}
								fractionDigits={priceSchemaDecimal}
								label={t("item.form.price.label")}
								fieldError={
									field.state.meta.isDirty ? field.state.meta.errors : undefined
								}
								isDisabled={isPending}
							/>
						)}
					</form.AppField>
					<form.AppField name="quantity">
						{(field) => (
							<field.NumberField
								value={field.state.value}
								onValueChange={field.setValue}
								name={field.name}
								onBlur={field.handleBlur}
								isRequired
								minValue={0}
								fractionDigits={quantitySchemaDecimal}
								label={t("item.form.quantity.label")}
								fieldError={
									field.state.meta.isDirty ? field.state.meta.errors : undefined
								}
								isDisabled={isDisabled}
							/>
						)}
					</form.AppField>
				</View>
				<form.Subscribe selector={(state) => state.canSubmit}>
					{(canSubmit) => (
						<Button
							color="primary"
							isDisabled={!canSubmit || isDisabled}
							className="w-full"
							isLoading={isPending}
							type="submit"
						>
							{t("item.form.saveButton")}
						</Button>
					)}
				</form.Subscribe>
			</form.Form>
		</form.AppForm>
	);
};
