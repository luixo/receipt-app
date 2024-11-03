import React from "react";
import { View } from "react-native";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import type { UseFormReturn } from "react-hook-form";
import { z } from "zod";

import { useInputController } from "~app/hooks/use-input-controller";
import { useTrpcMutationOptions } from "~app/hooks/use-trpc-mutation-options";
import type { TRPCQueryOutput } from "~app/trpc";
import { trpc } from "~app/trpc";
import {
	priceSchema,
	quantitySchema,
	receiptItemNameSchema,
} from "~app/utils/validation";
import { Button } from "~components/button";
import { Input } from "~components/input";
import { options as receiptItemsAddOptions } from "~mutations/receipt-items/add";

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

type Props = {
	receipt: TRPCQueryOutput<"receipts.get">;
	isDisabled: boolean;
};

export const AddReceiptItemForm: React.FC<Props> = ({
	receipt,
	isDisabled: isExternalDisabled,
}) => {
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
	const addMutation = trpc.receiptItems.add.useMutation(
		useTrpcMutationOptions(receiptItemsAddOptions, {
			context: receipt.id,
			onSuccess: () => form.reset(),
		}),
	);
	const onSubmit = React.useCallback(
		(values: Form) => addMutation.mutate({ ...values, receiptId: receipt.id }),
		[addMutation, receipt.id],
	);

	const isDisabled = isExternalDisabled || addMutation.isPending;

	return (
		<View className="gap-4">
			<View className="flex-row gap-4">
				<ReceiptItemNameInput form={form} isDisabled={isDisabled} />
				<ReceiptItemPriceInput form={form} isDisabled={isDisabled} />
				<ReceiptItemQuantityInput form={form} isDisabled={isDisabled} />
			</View>
			<Button
				color="primary"
				onClick={form.handleSubmit(onSubmit)}
				isDisabled={!form.formState.isValid || isDisabled}
				className="w-full"
				isLoading={addMutation.isPending}
			>
				Save
			</Button>
		</View>
	);
};
