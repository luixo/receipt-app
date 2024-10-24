import React from "react";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import type { UseFormReturn } from "react-hook-form";
import { useRouter } from "solito/navigation";
import { z } from "zod";

import { CurrencyInput } from "~app/components/app/currency-input";
import { DateInput } from "~app/components/date-input";
import { PageHeader } from "~app/components/page-header";
import { EmailVerificationCard } from "~app/features/email-verification/email-verification-card";
import { useInputController } from "~app/hooks/use-input-controller";
import { useTrpcMutationOptions } from "~app/hooks/use-trpc-mutation-options";
import { trpc } from "~app/trpc";
import type { CurrencyCode } from "~app/utils/currency";
import { currencyCodeSchema, receiptNameSchema } from "~app/utils/validation";
import { Button } from "~components/button";
import { Input } from "~components/input";
import type { AccountsId } from "~db/models";
import { options as receiptsAddOptions } from "~mutations/receipts/add";
import { getToday } from "~utils/date";
import type { AppPage } from "~utils/next";

type DateProps = {
	form: UseFormReturn<Form>;
	isLoading: boolean;
};

const ReceiptDateInput: React.FC<DateProps> = ({ form, isLoading }) => {
	const onDateUpdate = React.useCallback(
		(date: Date) => form.setValue("issued", date, { shouldValidate: true }),
		[form],
	);
	return (
		<DateInput
			label="Issued on"
			timestamp={form.getValues("issued")}
			isDisabled={isLoading}
			onUpdate={onDateUpdate}
			updateOnChange
			name="issued-date"
		/>
	);
};

type NameProps = {
	form: UseFormReturn<Form>;
	isLoading: boolean;
};

const ReceiptNameInput: React.FC<NameProps> = ({ form, isLoading }) => {
	const { bindings, state: inputState } = useInputController({
		name: "name",
		form,
	});

	return (
		<Input
			{...bindings}
			required
			label="Receipt name"
			isDisabled={isLoading}
			fieldError={inputState.error}
			name="name"
		/>
	);
};

type Form = {
	name: string;
	currencyCode: CurrencyCode;
	issued: Date;
};

export const AddReceiptScreen: AppPage = () => {
	const router = useRouter();
	const selfAccountId =
		trpc.account.get.useQuery().data?.account.id ??
		("unknown-account-id" as AccountsId);

	const addReceiptMutation = trpc.receipts.add.useMutation(
		useTrpcMutationOptions(receiptsAddOptions, {
			context: { selfAccountId },
			onSuccess: (id) => router.replace(`/receipts/${id}`),
		}),
	);

	const form = useForm<Form>({
		mode: "onChange",
		resolver: zodResolver(
			z.object({
				name: receiptNameSchema,
				currencyCode: currencyCodeSchema,
				issued: z.date(),
			}),
		),
		defaultValues: {
			name: "",
			issued: getToday(),
		},
	});
	const onSubmit = React.useCallback(
		(values: Form) =>
			addReceiptMutation.mutate({
				name: values.name,
				currencyCode: values.currencyCode,
				issued: values.issued,
			}),
		[addReceiptMutation],
	);
	const topCurrenciesQuery = trpc.currency.topReceipts.useQuery();

	return (
		<>
			<PageHeader backHref="/receipts">Add receipt</PageHeader>
			<EmailVerificationCard />
			<ReceiptNameInput form={form} isLoading={addReceiptMutation.isPending} />
			<CurrencyInput
				form={form}
				isLoading={addReceiptMutation.isPending}
				topCurrenciesQuery={topCurrenciesQuery}
			/>
			<ReceiptDateInput form={form} isLoading={addReceiptMutation.isPending} />
			<Button
				className="mt-4"
				color="primary"
				onClick={form.handleSubmit(onSubmit)}
				isDisabled={!form.formState.isValid || addReceiptMutation.isPending}
				isLoading={addReceiptMutation.isPending}
				type="submit"
			>
				Add receipt
			</Button>
		</>
	);
};
