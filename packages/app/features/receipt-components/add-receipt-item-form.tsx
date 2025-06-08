import React from "react";
import { View } from "react-native";

import { z } from "zod/v4";

import { useTrpcMutationState } from "~app/hooks/use-trpc-mutation-state";
import { trpc } from "~app/trpc";
import { useAppForm } from "~app/utils/forms";
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
	const { receiptId, receiptDisabled } = useReceiptContext();
	const { addItem } = useActionsHooksContext();
	const addItemMutationState = useTrpcMutationState<"receiptItems.add">(
		trpc.receiptItems.add,
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
								label="Item name"
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
								step={10 ** -priceSchemaDecimal}
								formatOptions={{ maximumFractionDigits: priceSchemaDecimal }}
								label="Price per unit"
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
								step={10 ** -quantitySchemaDecimal}
								formatOptions={{ maximumFractionDigits: quantitySchemaDecimal }}
								label="Units"
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
							Save
						</Button>
					)}
				</form.Subscribe>
			</form.Form>
		</form.AppForm>
	);
};
