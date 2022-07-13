import React from "react";

import { useForm, Controller } from "react-hook-form";
import { v4 } from "uuid";

import { AddButton } from "app/components/add-button";
import { Block } from "app/components/block";
import { MutationWrapper } from "app/components/mutation-wrapper";
import { useSubmitHandler } from "app/hooks/use-submit-handler";
import {
	UseContextedMutationOptions,
	useTrpcMutationOptions,
} from "app/hooks/use-trpc-mutation-options";
import { trpc } from "app/trpc";
import {
	ReceiptItemsGetInput,
	updateReceiptItems,
} from "app/utils/queries/receipt-items";
import { updateReceiptSum } from "app/utils/receipt";
import { Text, TextInput } from "app/utils/styles";
import { VALIDATIONS_CONSTANTS } from "app/utils/validation";
import { ReceiptsId } from "next-app/db/models";

const mutationOptions: UseContextedMutationOptions<
	"receipt-items.put",
	ReceiptsId,
	ReceiptItemsGetInput
> = {
	onMutate: (trpcContext, input) => (nextItemForm) => {
		const temporaryId = v4();
		updateReceiptItems(trpcContext, input, (items) => [
			...items,
			{
				id: temporaryId,
				...nextItemForm,
				locked: false,
				parts: [],
				dirty: true,
			},
		]);
		return temporaryId;
	},
	onError: (trpcContext, input) => (_error, _variables, temporaryId) => {
		updateReceiptItems(trpcContext, input, (items) =>
			items.filter((item) => item.id !== temporaryId)
		);
	},
	onSuccess: (trpcContext, input) => (remoteId, _variables, temporaryId) => {
		updateReceiptItems(trpcContext, input, (items) =>
			items.map((item) =>
				item.id === temporaryId ? { ...item, id: remoteId, dirty: false } : item
			)
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
	receiptItemsInput: ReceiptItemsGetInput;
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
	} = useForm<Form>({ mode: "onChange" });
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
				rules={{
					required: true,
					minLength: VALIDATIONS_CONSTANTS.receiptItemName.min,
					maxLength: VALIDATIONS_CONSTANTS.receiptItemName.max,
				}}
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
				rules={{
					required: true,
					validate: (input) => input > 0,
				}}
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
				rules={{
					required: true,
					validate: (input) => input > 0,
				}}
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
