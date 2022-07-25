import React from "react";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, Controller } from "react-hook-form";
import { z } from "zod";

import { cache } from "app/cache";
import { AddButton } from "app/components/add-button";
import { Block } from "app/components/block";
import { MutationWrapper } from "app/components/mutation-wrapper";
import { useSubmitHandler } from "app/hooks/use-submit-handler";
import { useTrpcMutationOptions } from "app/hooks/use-trpc-mutation-options";
import { trpc } from "app/trpc";
import { Text, TextInput } from "app/utils/styles";
import {
	priceSchema,
	quantitySchema,
	receiptItemNameSchema,
} from "app/utils/validation";
import { ReceiptsId } from "next-app/db/models";

type Form = {
	name: string;
	price: number;
	quantity: number;
};

type Props = {
	receiptId: ReceiptsId;
};

export const AddReceiptItemForm: React.FC<Props> = ({ receiptId }) => {
	const addReceiptItemMutation = trpc.useMutation(
		"receipt-items.put",
		useTrpcMutationOptions(cache.receiptItems.put.mutationOptions, receiptId)
	);
	const {
		control,
		handleSubmit,
		formState: { isValid, isSubmitting, errors },
		reset,
	} = useForm<Form>({
		mode: "onChange",
		resolver: zodResolver(
			z.object({
				name: receiptItemNameSchema,
				price: priceSchema,
				quantity: quantitySchema,
			})
		),
	});
	const onSubmit = useSubmitHandler<Form>(
		(values) => addReceiptItemMutation.mutateAsync({ ...values, receiptId }),
		[addReceiptItemMutation, receiptId, reset],
		reset
	);

	return (
		<Block name="Add receipt item">
			<Controller
				control={control}
				name="name"
				render={({ field: { onChange, value = "", onBlur } }) => (
					<>
						<TextInput
							placeholder="Enter item name"
							value={value}
							onBlur={onBlur}
							onChangeText={onChange}
							editable={!isSubmitting}
						/>
						{errors.name ? <Text>{errors.name.message}</Text> : null}
					</>
				)}
			/>
			<Controller
				control={control}
				name="price"
				render={({ field: { onChange, value = "", onBlur } }) => (
					<>
						<TextInput
							placeholder="Price"
							value={value.toString()}
							onBlur={onBlur}
							keyboardType="numeric"
							onChangeText={(nextValue) =>
								onChange(Number(nextValue.replace(/[^0-9]/g, "")))
							}
							editable={!isSubmitting}
						/>
						{errors.price ? <Text>{errors.price.message}</Text> : null}
					</>
				)}
			/>
			<Controller
				control={control}
				name="quantity"
				render={({ field: { onChange, value = "", onBlur } }) => (
					<>
						<TextInput
							placeholder="Quantity"
							value={value.toString()}
							onBlur={onBlur}
							keyboardType="numeric"
							onChangeText={(nextValue) =>
								onChange(Number(nextValue.replace(/[^0-9]/g, "")))
							}
							editable={!isSubmitting}
						/>
						{errors.quantity ? <Text>{errors.quantity.message}</Text> : null}
					</>
				)}
			/>
			<AddButton onPress={handleSubmit(onSubmit)} disabled={!isValid}>
				Add
			</AddButton>
			<MutationWrapper<"receipt-items.put"> mutation={addReceiptItemMutation}>
				{() => <Text>Add success!</Text>}
			</MutationWrapper>
		</Block>
	);
};
