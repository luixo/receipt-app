import React from "react";

import { zodResolver } from "@hookform/resolvers/zod";
import { Button, Loading, Spacer, styled, Text } from "@nextui-org/react";
import { useForm } from "react-hook-form";
import { useRouter } from "solito/router";
import { z } from "zod";

import { cache } from "app/cache";
import { MutationErrorMessage } from "app/components/mutation-error-message";
import { Page } from "app/components/page";
import { QueryErrorMessage } from "app/components/query-error-message";
import { EmailVerificationCard } from "app/features/email-verification/email-verification-card";
import { useSubmitHandler } from "app/hooks/use-submit-handler";
import { useTrpcMutationOptions } from "app/hooks/use-trpc-mutation-options";
import { trpc } from "app/trpc";
import { receiptNameSchema } from "app/utils/validation";
import { ReceiptsId } from "next-app/src/db/models";

import { CurrencyInput } from "./currency-input";
import { ReceiptNameInput } from "./receipt-name-input";
import { Form } from "./types";

const Header = styled(Text, {
	display: "flex",
	alignItems: "center",
});

export const AddReceiptScreen: React.FC = () => {
	const router = useRouter();
	const accountQuery = trpc.useQuery(["account.get"]);

	const addReceiptMutation = trpc.useMutation(
		"receipts.put",
		useTrpcMutationOptions(cache.receipts.put.mutationOptions, {
			selfAccountId: accountQuery.data?.id ?? "unknown",
		})
	);

	const form = useForm<Form>({
		mode: "onChange",
		resolver: zodResolver(
			z.object({
				name: receiptNameSchema,
				currency: z.object({ code: z.string().nonempty() }),
			})
		),
		defaultValues: {
			name: "",
		},
	});
	const onSubmit = useSubmitHandler<Form, ReceiptsId>(
		async (values) =>
			addReceiptMutation.mutateAsync({
				name: values.name,
				currency: values.currency.code,
			}),
		[addReceiptMutation, router],
		(id) => router.replace(`/receipts/${id}`)
	);

	return (
		<Page>
			{/* zero margin because of inherited margin from ChildText */}
			<Header h2 css={{ m: 0 }}>
				Add receipt
			</Header>
			<EmailVerificationCard />
			<Spacer y={1} />
			<ReceiptNameInput form={form} query={addReceiptMutation} />
			<Spacer y={1} />
			<CurrencyInput form={form} query={addReceiptMutation} />
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
		</Page>
	);
};
