import React from "react";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, Controller } from "react-hook-form";
import { useRouter } from "solito/router";
import { v4 } from "uuid";
import { z } from "zod";

import { cache, Cache } from "app/cache";
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
import { TextInput, Text } from "app/utils/styles";
import { receiptNameSchema } from "app/utils/validation";
import { AccountsId, ReceiptsId } from "next-app/src/db/models";

const putMutationOptions: UseContextedMutationOptions<
	"receipts.put",
	ReceiptsId,
	{ input: Cache.Receipts.GetPaged.Input; selfAccountId: AccountsId }
> = {
	onMutate:
		(trpcContext, { input }) =>
		(variables) => {
			const temporaryId = v4();
			cache.receipts.getPaged.add(trpcContext, input, {
				id: temporaryId,
				role: "owner",
				name: variables.name,
				issued: new Date(),
				currency: variables.currency,
				receiptResolved: false,
				participantResolved: false,
			});
			return temporaryId;
		},
	onError:
		(trpcContext, { input }) =>
		(_error, _variables, temporaryId) => {
			if (!temporaryId) {
				return;
			}
			cache.receipts.getPaged.remove(
				trpcContext,
				input,
				(receipt) => receipt.id === temporaryId
			);
		},
	onSuccess:
		(trpcContext, { input, selfAccountId }) =>
		(actualId, variables, temporaryId) => {
			cache.receipts.getPaged.update(
				trpcContext,
				input,
				temporaryId,
				(receipt) => ({
					...receipt,
					id: actualId,
					dirty: false,
				})
			);
			cache.receipts.get.add(
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
					ownerAccountId: selfAccountId,
					dirty: false,
				}
			);
			cache.receipts.getName.update(
				trpcContext,
				{ id: actualId },
				variables.name
			);
		},
};

type Form = {
	name: string;
	currency: string;
};

export const AddReceiptScreen: React.FC = () => {
	const router = useRouter();
	const accountQuery = trpc.useQuery(["account.get"]);

	const receiptsGetPagedInput = cache.receipts.getPaged.useStore();
	const addReceiptMutation = trpc.useMutation(
		"receipts.put",
		useTrpcMutationOptions(putMutationOptions, {
			input: receiptsGetPagedInput,
			selfAccountId: accountQuery.data?.id ?? "unknown",
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
			<AddButton
				onPress={handleSubmit(onSubmit)}
				disabled={!isValid || accountQuery.status !== "success"}
			>
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
