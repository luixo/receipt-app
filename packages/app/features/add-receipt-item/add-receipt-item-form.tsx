import React from "react";
import { View } from "react-native";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import type { UseFormReturn } from "react-hook-form";
import { z } from "zod";

import { useInputController } from "~app/hooks/use-input-controller";
import { useTrpcMutationOptions } from "~app/hooks/use-trpc-mutation-options";
import { trpc } from "~app/trpc";
import {
	priceSchema,
	quantitySchema,
	receiptItemNameSchema,
} from "~app/utils/validation";
import { Button } from "~components/button";
import { Input } from "~components/input";
import type { ReceiptsId } from "~db/models";
import { options as receiptItemsAddOptions } from "~mutations/receipt-items/add";

type NameProps = {
	form: UseFormReturn<Form>;
	isLoading: boolean;
};

const ReceiptItemNameInput: React.FC<NameProps> = ({ form, isLoading }) => {
	const { bindings, state: inputState } = useInputController({
		form,
		name: "name",
	});

	return (
		<Input
			{...bindings}
			required
			label="Item name"
			isDisabled={isLoading}
			fieldError={inputState.error}
			autoFocus
		/>
	);
};

type PriceProps = {
	form: UseFormReturn<Form>;
	isLoading: boolean;
};

const ReceiptItemPriceInput: React.FC<PriceProps> = ({ form, isLoading }) => {
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
			isDisabled={isLoading}
			fieldError={inputState.error}
		/>
	);
};

type QuantityProps = {
	form: UseFormReturn<Form>;
	isLoading: boolean;
};

const ReceiptItemQuantityInput: React.FC<QuantityProps> = ({
	form,
	isLoading,
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
			isDisabled={isLoading}
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
	receiptId: ReceiptsId;
	receiptLocked: boolean;
	isLoading: boolean;
};

export const AddReceiptItemForm: React.FC<Props> = ({
	receiptId,
	receiptLocked,
	isLoading: isDeleteLoading,
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
			context: receiptId,
			onSuccess: () => form.reset(),
		}),
	);
	const onSubmit = React.useCallback(
		(values: Form) => addMutation.mutate({ ...values, receiptId }),
		[addMutation, receiptId],
	);

	const isLoading = isDeleteLoading || addMutation.isPending;

	return (
		<View className="gap-4">
			<View className="flex-row gap-4">
				<ReceiptItemNameInput form={form} isLoading={isLoading} />
				<ReceiptItemPriceInput form={form} isLoading={isLoading} />
				<ReceiptItemQuantityInput form={form} isLoading={isLoading} />
			</View>
			<Button
				color="primary"
				onClick={form.handleSubmit(onSubmit)}
				isDisabled={!form.formState.isValid || isLoading || receiptLocked}
				className="w-full"
				isLoading={addMutation.isPending}
			>
				Save
			</Button>
		</View>
	);
};
