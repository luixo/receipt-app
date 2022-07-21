import React from "react";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, Controller } from "react-hook-form";
import { useRouter } from "solito/router";
import { v4 } from "uuid";
import { z } from "zod";

import { AddButton } from "app/components/add-button";
import { Block } from "app/components/block";
import { CurrenciesPicker } from "app/components/currencies-picker";
import { MutationWrapper } from "app/components/mutation-wrapper";
import { QueryWrapper } from "app/components/query-wrapper";
import { useSubmitHandler } from "app/hooks/use-submit-handler";
import {
	UseContextedMutationOptions,
	useTrpcMutationOptions,
} from "app/hooks/use-trpc-mutation-options";
import { trpc } from "app/trpc";
import { addReceipt } from "app/utils/queries/receipts-get";
import {
	updatePagedReceipts,
	ReceiptsGetPagedInput,
	receiptsGetPagedInputStore,
} from "app/utils/queries/receipts-get-paged";
import { TextInput, Text } from "app/utils/styles";
import { receiptNameSchema } from "app/utils/validation";
import { AccountsId, ReceiptsId } from "next-app/src/db/models";

const putMutationOptions: UseContextedMutationOptions<
	"receipts.put",
	ReceiptsId,
	{ input: ReceiptsGetPagedInput; ownerAccountId?: AccountsId }
> = {
	onMutate:
		(trpcContext, { input }) =>
		(form) => {
			const temporaryId = v4();
			updatePagedReceipts(trpcContext, input, (page, index) => {
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
	onError:
		(trpcContext, { input }) =>
		(_error, _variables, temporaryId) => {
			if (!temporaryId) {
				return;
			}
			updatePagedReceipts(trpcContext, input, (page) =>
				page.filter((receipt) => receipt.id !== temporaryId)
			);
		},
	onSuccess:
		(trpcContext, { input, ownerAccountId }) =>
		(actualId, variables, temporaryId) => {
			if (ownerAccountId) {
				addReceipt(
					trpcContext,
					{ id: actualId },
					{
						id: actualId,
						role: "owner",
						name: variables.name,
						issued: new Date(),
						currency: variables.currency,
						resolved: false,
						sum: "0",
						ownerAccountId,
						dirty: false,
					}
				);
			}
			updatePagedReceipts(trpcContext, input, (page) =>
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
	currency: string;
};

export const AddReceiptForm: React.FC = () => {
	const router = useRouter();
	const accountQuery = trpc.useQuery(["account.get"]);

	const receiptsGetPagedInput = receiptsGetPagedInputStore();
	const addReceiptMutation = trpc.useMutation(
		"receipts.put",
		useTrpcMutationOptions(putMutationOptions, {
			input: receiptsGetPagedInput,
			ownerAccountId: accountQuery.data?.id,
		})
	);

	const {
		control,
		handleSubmit,
		formState: { isValid, isSubmitting, errors },
		setValue,
	} = useForm<Form>({
		mode: "onChange",
		resolver: zodResolver(z.object({ name: receiptNameSchema })),
	});
	const onSubmit = useSubmitHandler<Form, ReceiptsId>(
		async (values) => addReceiptMutation.mutateAsync(values),
		[addReceiptMutation, router],
		(id) => router.replace(`/receipts/${id}`)
	);

	const currenciesListQuery = trpc.useQuery([
		"currency.get-list",
		{ locale: "en" },
	]);
	React.useEffect(() => {
		if (currenciesListQuery.data && currenciesListQuery.data[0]) {
			setValue("currency", currenciesListQuery.data[0].code);
		}
	}, [currenciesListQuery.data, setValue]);

	return (
		<Block name="Add receipt">
			<Controller
				control={control}
				name="name"
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
				render={({ field }) => (
					<QueryWrapper
						query={currenciesListQuery}
						value={field.value}
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
