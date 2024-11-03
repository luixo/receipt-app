import React from "react";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import type { UseFormReturn } from "react-hook-form";
import { useRouter } from "solito/navigation";

import { CurrencyInput } from "~app/components/app/currency-input";
import { DateInput } from "~app/components/date-input";
import { PageHeader } from "~app/components/page-header";
import { EmailVerificationCard } from "~app/features/email-verification/email-verification-card";
import { ReceiptComponents } from "~app/features/receipt-components/receipt-components";
import { useInputController } from "~app/hooks/use-input-controller";
import { useParticipants } from "~app/hooks/use-participants";
import { useTrpcMutationOptions } from "~app/hooks/use-trpc-mutation-options";
import { trpc } from "~app/trpc";
import { Button } from "~components/button";
import { Input } from "~components/input";
import type { AccountsId, UsersId } from "~db/models";
import { options as receiptsAddOptions } from "~mutations/receipts/add";
import { getToday } from "~utils/date";
import type { AppPage } from "~utils/next";

import { useActionsHooks, useAddReceiptContext } from "./hooks";
import type { Form, Item, Participant } from "./state";
import { formSchema } from "./state";

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

export const AddReceiptScreen: AppPage = () => {
	const router = useRouter();
	const selfAccountId =
		trpc.account.get.useQuery().data?.account.id ??
		("unknown-account-id" as AccountsId);

	const addReceiptMutation = trpc.receipts.add.useMutation(
		useTrpcMutationOptions(receiptsAddOptions, {
			context: { selfAccountId },
			onSuccess: ({ id }) => router.replace(`/receipts/${id}`),
		}),
	);

	const form = useForm<Form>({
		mode: "onChange",
		resolver: zodResolver(formSchema),
		defaultValues: {
			name: "",
			issued: getToday(),
		},
	});
	const [items, setItems] = React.useState<Item[]>([]);
	const [rawParticipants, setRawParticipants] = React.useState<Participant[]>(
		[],
	);
	const onSubmit = React.useCallback(
		(values: Form) =>
			addReceiptMutation.mutate({
				name: values.name,
				currencyCode: values.currencyCode,
				issued: values.issued,
				items: items.map(({ name, price, quantity, parts }) => ({
					name,
					price,
					quantity,
					parts,
				})),
				participants: rawParticipants.map(({ userId, role }) => ({
					userId,
					role,
				})),
			}),
		[addReceiptMutation, items, rawParticipants],
	);
	const topCurrenciesQuery = trpc.currency.topReceipts.useQuery();

	const receiptId = React.useId();
	const selfUserId = selfAccountId as UsersId;

	const { participants } = useParticipants({
		id: receiptId,
		...form.watch(),
		participants: rawParticipants,
		items,
		ownerUserId: selfUserId,
		selfUserId,
		debt: {
			direction: "outcoming",
			ids: [],
		},
		transferIntentionUserId: undefined,
	});
	const actionsHooksContext = useActionsHooks(setItems, setRawParticipants);
	const addReceiptContext = useAddReceiptContext(
		form,
		receiptId,
		selfUserId,
		items,
		participants,
	);

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
			<ReceiptComponents
				actionsHooks={actionsHooksContext}
				receipt={addReceiptContext}
			/>
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
