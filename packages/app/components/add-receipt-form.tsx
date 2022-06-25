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
	updatePagedReceipts,
	ReceiptsGetPagedInput,
} from "../utils/queries/receipts-get-paged";
import { TextInput, Text } from "../utils/styles";
import { VALIDATIONS_CONSTANTS } from "../utils/validation";
import { CurrenciesPicker } from "./currencies-picker";
import { Currency } from "../utils/currency";
import { QueryWrapper } from "./utils/query-wrapper";
import { useSubmitHandler } from "../hooks/use-submit-handler";

const putMutationOptions: UseContextedMutationOptions<
	"receipts.put",
	ReceiptsId,
	ReceiptsGetPagedInput
> = {
	onMutate: (trpc, input) => (form) => {
		const temporaryId = v4();
		updatePagedReceipts(trpc, input, (page, index) => {
			if (index === 0) {
				return [
					{
						id: temporaryId,
						role: "owner",
						name: form.name,
						issued: new Date(),
						currency: form.currency,
						receiptResolved: false,
						participantResolved: false,
						dirty: true,
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
		updatePagedReceipts(trpc, input, (page) =>
			page.filter((receipt) => receipt.id !== temporaryId)
		);
	},
	onSuccess: (trpc, input) => (actualId, _variables, temporaryId) => {
		if (!temporaryId) {
			return;
		}
		updatePagedReceipts(trpc, input, (page) =>
			page.map((receipt) =>
				receipt.id === temporaryId
					? { ...receipt, id: actualId, dirty: false }
					: receipt
			)
		);
	},
};

type Form = {
	name: string;
	currency: Currency;
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
		setValue,
	} = useForm<Form>({ mode: "onChange" });
	const onSubmit = useSubmitHandler<Form>(
		(values) => addReceiptMutation.mutateAsync(values),
		[addReceiptMutation, reset],
		reset
	);

	const currenciesListQuery = trpc.useQuery([
		"currency.get-list",
		{ locale: "en" },
	]);
	React.useEffect(() => {
		if (currenciesListQuery.data && currenciesListQuery.data[0]) {
			setValue("currency", currenciesListQuery.data[0].code);
		}
	}, [currenciesListQuery.data]);

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
			<Controller
				control={control}
				name="currency"
				rules={{ required: true }}
				render={({ field }) => (
					<QueryWrapper
						query={currenciesListQuery}
						value={field.value as Currency}
						onChange={field.onChange}
						onBlur={field.onBlur}
					>
						{CurrenciesPicker}
					</QueryWrapper>
				)}
			/>
			<MutationWrapper<"receipts.put"> mutation={addReceiptMutation}>
				{() => <Text>Add success!</Text>}
			</MutationWrapper>
		</Block>
	);
};
