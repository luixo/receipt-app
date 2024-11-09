import React from "react";
import { View } from "react-native";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import type { UseFormReturn } from "react-hook-form";
import { z } from "zod";

import { useInputController } from "~app/hooks/use-input-controller";
import { useTrpcMutationState } from "~app/hooks/use-trpc-mutation-state";
import { trpc } from "~app/trpc";
import {
	priceSchema,
	quantitySchema,
	receiptItemNameSchema,
} from "~app/utils/validation";
import { Button } from "~components/button";
import { Input } from "~components/input";

import { useActionsHooksContext, useReceiptContext } from "./context";

type NameProps = {
	form: UseFormReturn<Form>;
	isDisabled: boolean;
};

const ReceiptItemNameInput: React.FC<NameProps> = ({ form, isDisabled }) => {
	const { bindings, state: inputState } = useInputController({
		form,
		name: "name",
	});

	return (
		<Input
			{...bindings}
			required
			label="Item name"
			isDisabled={isDisabled}
			fieldError={inputState.error}
			autoFocus
		/>
	);
};

type PriceProps = {
	form: UseFormReturn<Form>;
	isDisabled: boolean;
};

const ReceiptItemPriceInput: React.FC<PriceProps> = ({ form, isDisabled }) => {
	const { bindings, state: inputState } = useInputController({
		form,
		name: "price",
		type: "number",
	});

	return (
		<Input
			{...bindings}
			required
			type="number"
			min="0"
			label="Price per unit"
			isDisabled={isDisabled}
			fieldError={inputState.error}
		/>
	);
};

type QuantityProps = {
	form: UseFormReturn<Form>;
	isDisabled: boolean;
};

const ReceiptItemQuantityInput: React.FC<QuantityProps> = ({
	form,
	isDisabled,
}) => {
	const { bindings, state: inputState } = useInputController({
		form,
		name: "quantity",
		type: "number",
	});

	return (
		<Input
			{...bindings}
			required
			type="number"
			min="0"
			label="Units"
			isDisabled={isDisabled}
			fieldError={inputState.error}
		/>
	);
};

type Form = {
	name: string;
	price: number;
	quantity: number;
};

export const AddReceiptItemForm: React.FC = () => {
	const { receiptId, receiptDisabled } = useReceiptContext();
	const form = useForm<Form>({
		mode: "onChange",
		resolver: zodResolver(
			z.object({
				name: receiptItemNameSchema,
				price: z.preprocess(Number, priceSchema),
				quantity: z.preprocess(Number, quantitySchema),
			}),
		),
		defaultValues: {
			name: "",
			// TODO: fix numbers in forms
			price: "" as unknown as number,
			quantity: 1,
		},
	});
	const { addItem } = useActionsHooksContext();
	const addItemMutationState = useTrpcMutationState<"receiptItems.add">(
		trpc.receiptItems.add,
		(vars) => vars.receiptId === receiptId,
	);
	const isPending = addItemMutationState?.status === "pending";
	const onSubmit = React.useCallback(
		(values: Form) =>
			addItem(values.name, values.price, values.quantity, {
				onSuccess: () => form.reset(),
			}),
		[addItem, form],
	);

	const isDisabled = receiptDisabled || isPending;

	return (
		<form
			onSubmit={form.handleSubmit(onSubmit)}
			className="flex flex-col gap-4"
		>
			<View className="flex-row gap-4">
				<ReceiptItemNameInput form={form} isDisabled={isDisabled} />
				<ReceiptItemPriceInput form={form} isDisabled={isDisabled} />
				<ReceiptItemQuantityInput form={form} isDisabled={isDisabled} />
			</View>
			<Button
				color="primary"
				isDisabled={!form.formState.isValid || isDisabled}
				className="w-full"
				isLoading={isPending}
				type="submit"
			>
				Save
			</Button>
		</form>
	);
};
