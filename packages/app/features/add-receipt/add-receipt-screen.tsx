import React from "react";

import { zodResolver } from "@hookform/resolvers/zod";
import { Spacer } from "@nextui-org/react";
import { Button } from "@nextui-org/react-tailwind";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { CurrencyInput } from "app/components/app/currency-input";
import { Header } from "app/components/header";
import { EmailVerificationCard } from "app/features/email-verification/email-verification-card";
import { useRouter } from "app/hooks/use-router";
import { useSelfAccountId } from "app/hooks/use-self-account-id";
import { useTrpcMutationOptions } from "app/hooks/use-trpc-mutation-options";
import { mutations } from "app/mutations";
import { trpc } from "app/trpc";
import { getToday } from "app/utils/date";
import { currencySchema, receiptNameSchema } from "app/utils/validation";
import type { AppPage } from "next-app/types/page";

import { ReceiptDateInput } from "./receipt-date-input";
import { ReceiptNameInput } from "./receipt-name-input";
import type { Form } from "./types";

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
				currency: currencySchema,
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
				currencyCode: values.currency.code,
				issued: values.issued,
			}),
		[addReceiptMutation],
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
				color="primary"
				onClick={form.handleSubmit(onSubmit)}
				isDisabled={
					!form.formState.isValid ||
					addReceiptMutation.isLoading ||
					!selfAccountId
				}
				isLoading={addReceiptMutation.isLoading}
			>
				Add receipt
			</Button>
		</>
	);
};
