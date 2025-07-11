import React from "react";

import { useMutation } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";

import { CurrencyInput } from "~app/components/app/currency-input";
import { DateInput } from "~app/components/date-input";
import {
	ActionsHooksContext,
	ReceiptContext,
} from "~app/features/receipt-components/context";
import { ReceiptItems } from "~app/features/receipt-components/receipt-items";
import { ReceiptParticipants } from "~app/features/receipt-components/receipt-participants";
import type { Payer } from "~app/features/receipt-components/state";
import { useNavigate } from "~app/hooks/use-navigation";
import { useParticipants } from "~app/hooks/use-participants";
import { useTrpcMutationOptions } from "~app/hooks/use-trpc-mutation-options";
import { useAppForm, useTypedValues } from "~app/utils/forms";
import { useTRPC } from "~app/utils/trpc";
import { Button } from "~components/button";
import type { AccountsId, UsersId } from "~db/models";
import { options as receiptsAddOptions } from "~mutations/receipts/add";
import { getNow } from "~utils/date";

import { useActionsHooks, useAddReceiptContext } from "./hooks";
import type { Form, Item, Participant } from "./state";
import { formSchema } from "./state";

type Props = {
	selfAccountId: AccountsId;
};

export const AddReceipt: React.FC<Props> = ({ selfAccountId }) => {
	const { t } = useTranslation("receipts");
	const trpc = useTRPC();
	const navigate = useNavigate();

	const addReceiptMutation = useMutation(
		trpc.receipts.add.mutationOptions(
			useTrpcMutationOptions(receiptsAddOptions, {
				context: { selfAccountId },
				onSuccess: ({ id }) =>
					navigate({ to: "/receipts/$id", params: { id }, replace: true }),
			}),
		),
	);

	const [items, setItems] = React.useState<Item[]>([]);
	const [rawParticipants, setRawParticipants] = React.useState<Participant[]>(
		[],
	);
	const [payers, setPayers] = React.useState<Payer[]>([]);

	const defaultValues = {
		name: "",
		issued: getNow.plainDate(),
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
				items: items.map(({ name, price, quantity, consumers }) => ({
					name,
					price,
					quantity,
					consumers: consumers.map(({ userId, part }) => ({ userId, part })),
				})),
				participants: rawParticipants.map(({ userId, role }) => ({
					userId,
					role,
				})),
				payers: payers.map(({ userId, part }) => ({
					userId,
					part,
				})),
			});
		},
	});
	const formValues = useTypedValues(form.store, defaultValues);

	const formId = React.useId();
	const receiptId = React.useId();
	const selfUserId = selfAccountId as UsersId;

	const { participants } = useParticipants({
		id: receiptId,
		createdAt: getNow.zonedDateTime(),
		issued: formValues.issued,
		currencyCode: formValues.currencyCode ?? "???",
		participants: rawParticipants,
		items,
		ownerUserId: selfUserId,
		selfUserId,
		payers,
		debt: {
			direction: "outcoming",
			ids: [],
		},
	});
	const actionsHooks = useActionsHooks(setItems, setRawParticipants, setPayers);
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
										field.state.meta.isDirty
											? field.state.meta.errors
											: undefined
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
					<ReceiptParticipants />
					<ReceiptItems />
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
			</ActionsHooksContext>
		</ReceiptContext>
	);
};
