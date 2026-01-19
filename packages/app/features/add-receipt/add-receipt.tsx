import React from "react";

import type {
	FormAsyncValidateOrFn,
	FormState,
	FormValidateOrFn,
} from "@tanstack/react-form";
import {
	skipToken,
	useMutation,
	useQueryClient,
	useSuspenseQuery,
} from "@tanstack/react-query";
import type { Derived } from "@tanstack/react-store";
import { useTranslation } from "react-i18next";
import type z from "zod";

import { CurrencyInput } from "~app/components/app/currency-input";
import { suspendedFallback } from "~app/components/suspense-wrapper";
import { NavigationContext } from "~app/contexts/navigation-context";
import {
	ActionsHooksContext,
	ReceiptContext,
} from "~app/features/receipt-components/context";
import {
	ReceiptItems,
	SkeletonAddReceiptItemController,
} from "~app/features/receipt-components/receipt-items";
import { ReceiptParticipants } from "~app/features/receipt-components/receipt-participants";
import type { Payer } from "~app/features/receipt-components/state";
import { useParticipants } from "~app/hooks/use-participants";
import { useTrpcMutationOptions } from "~app/hooks/use-trpc-mutation-options";
import { useAppForm, useTypedValues } from "~app/utils/forms";
import { useTRPC } from "~app/utils/trpc";
import { Button } from "~components/button";
import { DateInput } from "~components/date-input";
import type { UserId } from "~db/ids";
import { options as receiptsAddOptions } from "~mutations/receipts/add";
import { getNow } from "~utils/date";
import type { UseStateReturn } from "~utils/react";

import { useActionsHooks, useAddReceiptContext } from "./hooks";
import type { Form, Item, Participant } from "./state";
import { formSchema } from "./state";

const ContextedAddReceipt = suspendedFallback<{
	formStore: Derived<
		FormState<
			Form,
			typeof formSchema,
			typeof formSchema,
			FormAsyncValidateOrFn<Form> | undefined,
			FormValidateOrFn<Form> | undefined,
			FormAsyncValidateOrFn<Form> | undefined,
			typeof formSchema,
			FormAsyncValidateOrFn<Form> | undefined,
			FormValidateOrFn<Form> | undefined,
			FormAsyncValidateOrFn<Form> | undefined,
			FormAsyncValidateOrFn<Form> | undefined
		>
	>;
	defaultFormValues: Pick<z.infer<typeof formSchema>, "name" | "issued">;
	itemsState: UseStateReturn<Item[]>;
	participantsState: UseStateReturn<Participant[]>;
	payersState: UseStateReturn<Payer[]>;
}>(
	({
		formStore,
		defaultFormValues,
		itemsState: [items, setItems],
		participantsState: [rawParticipants, setParticipants],
		payersState: [payers, setPayers],
	}) => {
		const trpc = useTRPC();
		const { data: account } = useSuspenseQuery(trpc.account.get.queryOptions());
		const selfUserId = account.account.id as UserId;
		const formValues = useTypedValues(formStore, defaultFormValues);
		const receiptId = React.useId();
		const participants = useParticipants({
			id: receiptId,
			createdAt: getNow.zonedDateTime(),
			issued: formValues.issued,
			currencyCode: formValues.currencyCode ?? "???",
			participants: rawParticipants,
			items,
			ownerUserId: selfUserId,
			selfUserId,
			payers,
			debts: {
				direction: "outcoming",
				debts: [],
			},
		});
		const actionsHooks = useActionsHooks(setItems, setParticipants, setPayers);
		const addReceiptContext = useAddReceiptContext(
			formValues,
			receiptId,
			selfUserId,
			payers,
			items,
			participants,
		);
		return (
			<ReceiptContext value={addReceiptContext}>
				<ActionsHooksContext value={actionsHooks}>
					<ReceiptParticipants />
					<ReceiptItems />
				</ActionsHooksContext>
			</ReceiptContext>
		);
	},
	() => {
		const { t } = useTranslation("receipts");
		return (
			<>
				<Button isDisabled>{t("participants.addButton")}</Button>
				<SkeletonAddReceiptItemController />
			</>
		);
	},
);

export const AddReceipt = () => {
	const { t } = useTranslation("receipts");
	const trpc = useTRPC();
	const { useNavigate } = React.use(NavigationContext);
	const navigate = useNavigate();

	const queryClient = useQueryClient();
	const optimisticAccount = queryClient.getQueryData(
		trpc.account.get.queryOptions().queryKey,
	);
	const addReceiptMutation = useMutation(
		trpc.receipts.add.mutationOptions(
			useTrpcMutationOptions(receiptsAddOptions, {
				context: optimisticAccount
					? { selfAccountId: optimisticAccount.account.id }
					: skipToken,
				onSuccess: ({ id }) =>
					navigate({ to: "/receipts/$id", params: { id }, replace: true }),
			}),
		),
	);

	/* eslint-disable react/hook-use-state */
	const itemsState = React.useState<Item[]>([]);
	const participantsState = React.useState<Participant[]>([]);
	const payersState = React.useState<Payer[]>([]);
	/* eslint-enable react/hook-use-state */

	// If we preloaded top currency codes for receipts - we can initialize our form with it
	const optimisticCurrencyCode = queryClient.getQueryData(
		trpc.currency.top.queryOptions({
			options: { type: "receipts" },
		}).queryKey,
	)?.[0]?.currencyCode;
	const defaultValues = {
		name: "",
		issued: getNow.plainDate(),
		currencyCode: optimisticCurrencyCode,
	} satisfies Partial<Form>;
	const form = useAppForm({
		defaultValues: defaultValues as Form,
		validators: {
			onMount: formSchema,
			onChange: formSchema,
			onSubmit: formSchema,
		},
		onSubmit: ({ value }) => {
			addReceiptMutation.mutate({
				name: value.name,
				currencyCode: value.currencyCode,
				issued: value.issued,
				items: itemsState[0].map(({ name, price, quantity, consumers }) => ({
					name,
					price,
					quantity,
					consumers: consumers.map(({ userId, part }) => ({ userId, part })),
				})),
				participants: participantsState[0].map(({ userId, role }) => ({
					userId,
					role,
				})),
				payers: payersState[0].map(({ userId, part }) => ({
					userId,
					part,
				})),
			});
		},
	});

	const formId = React.useId();

	return (
		<form.AppForm>
			<form.Form id={formId} className="flex flex-col gap-4">
				<form.AppField name="name">
					{(field) => (
						<field.TextField
							label={t("receipt.form.name.label")}
							value={field.state.value}
							onValueChange={field.setValue}
							name={field.name}
							onBlur={field.handleBlur}
							isRequired
							mutation={addReceiptMutation}
							fieldError={
								field.state.meta.isDirty ? field.state.meta.errors : undefined
							}
						/>
					)}
				</form.AppField>
				<form.AppField name="currencyCode">
					{(field) => (
						<CurrencyInput
							mutation={addReceiptMutation}
							topQueryOptions={{ type: "receipts" }}
							value={field.state.value}
							onValueChange={field.setValue}
						/>
					)}
				</form.AppField>
				<form.AppField name="issued">
					{(field) => (
						<DateInput
							label={t("receipt.form.issued.label")}
							name="issued-date"
							value={field.state.value}
							onValueChange={field.setValue}
							mutation={addReceiptMutation}
						/>
					)}
				</form.AppField>
			</form.Form>
			<ContextedAddReceipt
				formStore={form.store}
				defaultFormValues={defaultValues}
				itemsState={itemsState}
				participantsState={participantsState}
				payersState={payersState}
			/>
			<form.Subscribe selector={(state) => state.canSubmit}>
				{(canSubmit) => (
					<Button
						className="mt-4"
						color="primary"
						isDisabled={!canSubmit || addReceiptMutation.isPending}
						isLoading={addReceiptMutation.isPending}
						type="submit"
						form={formId}
					>
						{t("add.saveButton")}
					</Button>
				)}
			</form.Subscribe>
		</form.AppForm>
	);
};
