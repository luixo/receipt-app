import React from "react";

import { zodResolver } from "@hookform/resolvers/zod";
import { Button, Loading, Spacer } from "@nextui-org/react";
import { useForm } from "react-hook-form";
import { useRouter } from "solito/router";
import { z } from "zod";

import { CurrencyInput } from "app/components/app/currency-input";
import {
	MutationErrorMessage,
	QueryErrorMessage,
} from "app/components/error-message";
import { Header } from "app/components/header";
import { EmailVerificationCard } from "app/features/email-verification/email-verification-card";
import { useTrpcMutationOptions } from "app/hooks/use-trpc-mutation-options";
import { mutations } from "app/mutations";
import { trpc } from "app/trpc";
import { getToday } from "app/utils/date";
import { currencyObjectSchema, receiptNameSchema } from "app/utils/validation";
import { AppPage } from "next-app/types/page";

import { ReceiptDateInput } from "./receipt-date-input";
import { ReceiptNameInput } from "./receipt-name-input";
import { Form } from "./types";

export const AddReceiptScreen: AppPage = () => {
	const router = useRouter();
	const accountQuery = trpc.account.get.useQuery();

	const addReceiptMutation = trpc.receipts.add.useMutation(
		useTrpcMutationOptions(mutations.receipts.add.options, {
			context: {
				selfAccountId: accountQuery.data?.id ?? "unknown",
			},
			onSuccess: (id) => router.replace(`/receipts/${id}`),
		})
	);

	const form = useForm<Form>({
		mode: "onChange",
		resolver: zodResolver(
			z.object({
				name: receiptNameSchema,
				currency: currencyObjectSchema,
				issued: z.date(),
			})
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
				currency: values.currency.code,
				issued: values.issued,
			}),
		[addReceiptMutation]
	);
	const topCurrenciesQuery = trpc.currency.topReceipts.useQuery();

	return (
		<>
			<Header backHref="/receipts">Add receipt</Header>
			<EmailVerificationCard />
			<Spacer y={1} />
			<ReceiptNameInput form={form} query={addReceiptMutation} />
			<Spacer y={1} />
			<CurrencyInput
				form={form}
				isLoading={addReceiptMutation.isLoading}
				topCurrenciesQuery={topCurrenciesQuery}
			/>
			<Spacer y={1} />
			<ReceiptDateInput form={form} query={addReceiptMutation} />
			<Spacer y={1} />
			<Button
				onClick={form.handleSubmit(onSubmit)}
				disabled={
					!form.formState.isValid ||
					addReceiptMutation.isLoading ||
					accountQuery.status !== "success"
				}
			>
				{addReceiptMutation.isLoading ? <Loading size="sm" /> : "Add receipt"}
			</Button>
			{addReceiptMutation.status === "error" ? (
				<>
					<Spacer y={1} />
					<MutationErrorMessage mutation={addReceiptMutation} />
				</>
			) : null}
			{accountQuery.status === "error" ? (
				<>
					<Spacer y={1} />
					<QueryErrorMessage query={accountQuery} />
				</>
			) : null}
		</>
	);
};
