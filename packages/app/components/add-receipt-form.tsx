import React from "react";
import { v4 } from "uuid";

import { useForm, Controller } from "react-hook-form";
import { AddButton } from "./utils/add-button";
import { trpc } from "../trpc";
import { Block } from "./utils/block";
import { MutationWrapper } from "./utils/mutation-wrapper";
import {
	UseContextedMutationOptions,
	useTrpcMutationOptions,
} from "../hooks/use-trpc-mutation-options";
import { ReceiptsId } from "next-app/src/db/models";
import {
	updateReceipts,
	ReceiptsGetPagedInput,
} from "../utils/queries/receipts";
import { TextInput, Text } from "../utils/styles";
import { VALIDATIONS_CONSTANTS } from "../utils/validation";

const putMutationOptions: UseContextedMutationOptions<
	"receipts.put",
	ReceiptsId,
	ReceiptsGetPagedInput
> = {
	onMutate: (trpc, input) => (form) => {
		const temporaryId = v4();
		updateReceipts(trpc, input, (page, index) => {
			if (index === 0) {
				return [
					{
						id: temporaryId,
						role: "owner",
						name: form.name,
						issued: new Date(),
						currency: "USD",
						receiptResolved: false,
						participantResolved: false,
					},
					...page,
				];
			}
			return page;
		});
		return temporaryId;
	},
	onError: (trpc, input) => (_error, _variables, temporaryId) => {
		if (!temporaryId) {
			return;
		}
		updateReceipts(trpc, input, (page) =>
			page.filter((receipt) => receipt.id !== temporaryId)
		);
	},
	onSuccess: (trpc, input) => (actualId, _variables, temporaryId) => {
		if (!temporaryId) {
			return;
		}
		updateReceipts(trpc, input, (page) =>
			page.map((receipt) =>
				receipt.id === temporaryId ? { ...receipt, id: actualId } : receipt
			)
		);
	},
};

type Form = {
	name: string;
};

type Props = {
	input: ReceiptsGetPagedInput;
};

export const AddReceiptForm: React.FC<Props> = ({ input }) => {
	const addReceiptMutation = trpc.useMutation(
		"receipts.put",
		useTrpcMutationOptions(putMutationOptions, input)
	);
	const {
		control,
		handleSubmit,
		formState: { isValid, isSubmitting, errors },
		reset,
	} = useForm<Form>();
	const onSubmit = React.useCallback(
		async (values: Form) => {
			await addReceiptMutation.mutateAsync(values);
			reset();
		},
		[addReceiptMutation, reset]
	);

	return (
		<Block name="Add receipt">
			<Controller
				control={control}
				name="name"
				rules={{
					required: true,
					minLength: VALIDATIONS_CONSTANTS.receiptName.min,
					maxLength: VALIDATIONS_CONSTANTS.receiptName.max,
				}}
				render={({ field: { onChange, value = "", onBlur } }) => (
					<>
						<TextInput
							placeholder="Enter receipt name"
							value={value}
							onBlur={onBlur}
							onChangeText={onChange}
							editable={!isSubmitting}
						/>
						{errors.name ? <Text>{errors.name.message}</Text> : null}
					</>
				)}
			/>
			<AddButton onPress={handleSubmit(onSubmit)} disabled={!isValid}>
				Add
			</AddButton>
			<MutationWrapper<"receipts.put"> mutation={addReceiptMutation}>
				{() => <Text>Add success!</Text>}
			</MutationWrapper>
		</Block>
	);
};
