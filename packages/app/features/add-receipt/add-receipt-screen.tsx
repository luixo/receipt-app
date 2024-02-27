import React from "react";

import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@nextui-org/react";
import { useForm } from "react-hook-form";
import type { UseFormReturn } from "react-hook-form";
import { useRouter } from "solito/navigation";
import { z } from "zod";

import { CurrencyInput } from "app/components/app/currency-input";
import { Input } from "app/components/base/input";
import { DateInput } from "app/components/date-input";
import { PageHeader } from "app/components/page-header";
import { EmailVerificationCard } from "app/features/email-verification/email-verification-card";
import { useInputController } from "app/hooks/use-input-controller";
import { useSelfAccountId } from "app/hooks/use-self-account-id";
import { useTrpcMutationOptions } from "app/hooks/use-trpc-mutation-options";
import { mutations } from "app/mutations";
import { trpc } from "app/trpc";
import type { CurrencyCode } from "app/utils/currency";
import { getToday } from "app/utils/date";
import { currencyCodeSchema, receiptNameSchema } from "app/utils/validation";
import type { AppPage } from "next-app/types/page";

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
	const selfAccountId = useSelfAccountId();

	const addReceiptMutation = trpc.receipts.add.useMutation(
		useTrpcMutationOptions(mutations.receipts.add.options, {
			context: {
				selfAccountId: selfAccountId || "unknown",
			},
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
				isDisabled={
					!form.formState.isValid ||
					addReceiptMutation.isPending ||
					!selfAccountId
				}
				isLoading={addReceiptMutation.isPending}
			>
				Add receipt
			</Button>
		</>
	);
};
