import React from "react";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, Controller } from "react-hook-form";
import { v4 } from "uuid";
import { z } from "zod";

import { cache, Cache } from "app/cache";
import { AddButton } from "app/components/add-button";
import { Block } from "app/components/block";
import { MutationWrapper } from "app/components/mutation-wrapper";
import { useSubmitHandler } from "app/hooks/use-submit-handler";
import {
	UseContextedMutationOptions,
	useTrpcMutationOptions,
} from "app/hooks/use-trpc-mutation-options";
import { trpc } from "app/trpc";
import { updateReceiptSum } from "app/utils/receipt";
import { Text, TextInput } from "app/utils/styles";
import {
	priceSchema,
	quantitySchema,
	receiptItemNameSchema,
} from "app/utils/validation";
import { ReceiptItemsId } from "next-app/db/models";

const mutationOptions: UseContextedMutationOptions<
	"receipt-items.put",
	ReceiptItemsId,
	Cache.ReceiptItems.Get.Input
> = {
	onMutate: (trpcContext, input) => (variables) => {
		const temporaryId = v4();
		cache.receiptItems.get.receiptItem.add(trpcContext, input, {
			id: temporaryId,
			name: variables.name,
			price: variables.price,
			quantity: variables.quantity,
			locked: false,
			parts: [],
			dirty: true,
		});
		return temporaryId;
	},
	onError: (trpcContext, input) => (_error, _variables, temporaryId) => {
		cache.receiptItems.get.receiptItem.remove(
			trpcContext,
			input,
			(item) => item.id === temporaryId
		);
	},
	onSuccess: (trpcContext, input) => (actualId, _variables, temporaryId) => {
		cache.receiptItems.get.receiptItem.update(
			trpcContext,
			input,
			temporaryId,
			(item) => ({
				...item,
				id: actualId,
				dirty: false,
			})
		);
		updateReceiptSum(trpcContext, input);
	},
};

type Form = {
	name: string;
	price: number;
	quantity: number;
};

type Props = {
	receiptItemsInput: Cache.ReceiptItems.Get.Input;
};

export const AddReceiptItemForm: React.FC<Props> = ({ receiptItemsInput }) => {
	const addReceiptItemMutation = trpc.useMutation(
		"receipt-items.put",
		useTrpcMutationOptions(mutationOptions, receiptItemsInput)
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
		(values) =>
			addReceiptItemMutation.mutateAsync({
				...values,
				receiptId: receiptItemsInput.receiptId,
			}),
		[addReceiptItemMutation, receiptItemsInput.receiptId, reset],
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
