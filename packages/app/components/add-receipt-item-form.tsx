import React from "react";
import { v4 } from "uuid";
import { useForm, Controller } from "react-hook-form";
import { ReceiptsId } from "next-app/db/models";
import { trpc } from "../trpc";
import { AddButton } from "./utils/add-button";
import { Block } from "./utils/block";
import { MutationWrapper } from "./utils/mutation-wrapper";
import {
	UseContextedMutationOptions,
	useTrpcMutationOptions,
} from "../hooks/use-trpc-mutation-options";
import {
	ReceiptItemsGetInput,
	updateReceiptItems,
} from "../utils/queries/receipt-items";
import { VALIDATIONS_CONSTANTS } from "../utils/validation";
import { Text, TextInput } from "../utils/styles";
import { useSubmitHandler } from "../hooks/use-submit-handler";
import { updateReceiptSum } from "../utils/receipt";

const mutationOptions: UseContextedMutationOptions<
	"receipt-items.put",
	ReceiptsId,
	ReceiptItemsGetInput
> = {
	onMutate: (trpc, input) => (nextItemForm) => {
		const temporaryId = v4();
		updateReceiptItems(trpc, input, (items) => [
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
	onError: (trpc, input) => (_error, _variables, temporaryId) => {
		updateReceiptItems(trpc, input, (items) =>
			items.filter((item) => item.id !== temporaryId)
		);
	},
	onSuccess: (trpc, input) => (remoteId, _variables, temporaryId) => {
		updateReceiptItems(trpc, input, (items) =>
			items.map((item) =>
				item.id === temporaryId ? { ...item, id: remoteId, dirty: false } : item
			)
		);
		updateReceiptSum(trpc, input);
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
							onChangeText={(value) =>
								onChange(Number(value.replace(/[^0-9]/g, "")))
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
							onChangeText={(value) =>
								onChange(Number(value.replace(/[^0-9]/g, "")))
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
