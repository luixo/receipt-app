import React from "react";

import { isNonNullish } from "remeda";
import { useRouter, useSearchParams } from "solito/navigation";
import { z } from "zod";

import { CurrencyInput } from "~app/components/app/currency-input";
import { LoadableUser } from "~app/components/app/loadable-user";
import {
	type Direction,
	SignButtonGroup,
} from "~app/components/app/sign-button-group";
import { UsersSuggest } from "~app/components/app/users-suggest";
import { DateInput } from "~app/components/date-input";
import { PageHeader } from "~app/components/page-header";
import { EmailVerificationCard } from "~app/features/email-verification/email-verification-card";
import { useTrpcMutationOptions } from "~app/hooks/use-trpc-mutation-options";
import { trpc } from "~app/trpc";
import { useAppForm } from "~app/utils/forms";
import {
	currencyCodeSchema,
	debtAmountSchema,
	debtAmountSchemaDecimal,
	debtNoteSchema,
	userIdSchema,
} from "~app/utils/validation";
import { Button } from "~components/button";
import type { UsersId } from "~db/models";
import { options as debtsAddOptions } from "~mutations/debts/add";
import { getToday } from "~utils/date";
import type { AppPage } from "~utils/next";

const formSchema = z.object({
	amount: debtAmountSchema,
	direction: z.union([z.literal("-"), z.literal("+")]),
	currencyCode: currencyCodeSchema,
	userId: userIdSchema,
	note: debtNoteSchema,
	timestamp: z.date(),
});

type Form = z.infer<typeof formSchema>;

export const AddDebtScreen: AppPage = () => {
	const searchParams = useSearchParams<{ userId: UsersId }>();
	const userId = searchParams?.get("userId");

	const router = useRouter();

	const addMutation = trpc.debts.add.useMutation(
		useTrpcMutationOptions(debtsAddOptions, {
			onSuccess: ({ id }) => router.replace(`/debts/${id}`),
		}),
	);

	const defaultValues: Partial<Form> = {
		note: "",
		direction: "+",
		timestamp: getToday(),
		userId: userId || undefined,
	};

	const form = useAppForm({
		defaultValues: defaultValues as Form,
		validators: {
			onChange: formSchema,
		},
		onSubmit: ({ value }) => {
			addMutation.mutate({
				note: value.note,
				currencyCode: value.currencyCode,
				userId: value.userId,
				amount: value.amount * (value.direction === "+" ? 1 : -1),
				timestamp: value.timestamp,
			});
		},
	});

	const onDirectionUpdate = React.useCallback(
		(direction: Direction) => form.setFieldValue("direction", direction),
		[form],
	);

	return (
		<>
			<PageHeader backHref="/debts">Add debt</PageHeader>
			<EmailVerificationCard />
			<form.AppForm>
				<form.Form className="flex flex-col gap-4">
					<form.Subscribe selector={(state) => state.values.direction}>
						{(direction) => (
							<SignButtonGroup
								isLoading={addMutation.isPending}
								onUpdate={onDirectionUpdate}
								direction={direction}
							/>
						)}
					</form.Subscribe>
					<form.AppField name="amount">
						{(field) => (
							<field.NumberField
								value={field.state.value}
								onValueChange={field.setValue}
								name={field.name}
								onBlur={field.handleBlur}
								isRequired
								minValue={0}
								label="Amount"
								isDisabled={addMutation.isPending}
								errorMessage={field.state.meta.errors
									.filter(isNonNullish)
									.map((error) => error.message)
									.join("\n")}
								step={10 ** -debtAmountSchemaDecimal}
							/>
						)}
					</form.AppField>
					<form.AppField name="currencyCode">
						{(field) => (
							<CurrencyInput
								mutation={addMutation}
								topQueryOptions={{ type: "debts" }}
								value={field.state.value}
								onValueChange={field.setValue}
							/>
						)}
					</form.AppField>
					<form.AppField name="userId">
						{(field) => (
							<UsersSuggest
								selected={field.state.value}
								isDisabled={addMutation.isPending}
								onUserClick={field.setValue}
								closeOnSelect
							>
								{field.state.value ? (
									<LoadableUser
										id={field.state.value}
										avatarProps={{ size: "sm" }}
									/>
								) : null}
							</UsersSuggest>
						)}
					</form.AppField>
					<form.AppField name="timestamp">
						{(field) => (
							<DateInput
								value={field.state.value}
								onValueChange={field.setValue}
								mutation={addMutation}
							/>
						)}
					</form.AppField>
					<form.AppField name="note">
						{(field) => (
							<field.TextField
								label="Debt note"
								value={field.state.value}
								onValueChange={field.setValue}
								name={field.name}
								onBlur={field.handleBlur}
								isRequired
								mutation={addMutation}
								fieldError={field.state.meta.errors}
							/>
						)}
					</form.AppField>
					<form.Subscribe selector={(state) => state.canSubmit}>
						{(canSubmit) => (
							<Button
								className="mt-4"
								color="primary"
								isDisabled={!canSubmit || addMutation.isPending}
								isLoading={addMutation.isPending}
								type="submit"
							>
								Add debt
							</Button>
						)}
					</form.Subscribe>
				</form.Form>
			</form.AppForm>
		</>
	);
};
