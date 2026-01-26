import React from "react";

import { useMutation } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { isNonNullish } from "remeda";
import { z } from "zod";

import { CurrencyInput } from "~app/components/app/currency-input";
import {
	type Direction,
	SignButtonGroup,
} from "~app/components/app/sign-button-group";
import { UsersSuggest } from "~app/components/app/users-suggest";
import { PageHeader } from "~app/components/page-header";
import { NavigationContext } from "~app/contexts/navigation-context";
import { EmailVerificationCard } from "~app/features/email-verification/email-verification-card";
import { useTrpcMutationOptions } from "~app/hooks/use-trpc-mutation-options";
import { useAppForm } from "~app/utils/forms";
import type { SearchParamState } from "~app/utils/navigation";
import { useTRPC } from "~app/utils/trpc";
import {
	currencyCodeSchema,
	debtAmountSchema,
	debtAmountSchemaDecimal,
	debtNoteSchema,
	userIdSchema,
} from "~app/utils/validation";
import { BackLink } from "~components/back-link";
import { Button } from "~components/button";
import { DateInput } from "~components/date-input";
import { options as debtsAddOptions } from "~mutations/debts/add";
import { getNow, temporalSchemas } from "~utils/date";

const formSchema = z.object({
	amount: debtAmountSchema,
	direction: z.literal(["-", "+"]),
	currencyCode: currencyCodeSchema,
	userId: userIdSchema,
	note: debtNoteSchema,
	timestamp: temporalSchemas.plainDate,
});

type Form = z.infer<typeof formSchema>;

export const AddDebtScreen: React.FC<{
	userIdState: SearchParamState<"/debts/add", "userId">;
}> = ({ userIdState: [userId, setUserId] }) => {
	const { t } = useTranslation("debts");
	const trpc = useTRPC();
	const { useNavigate } = React.use(NavigationContext);
	const navigate = useNavigate();

	const addMutation = useMutation(
		trpc.debts.add.mutationOptions(
			useTrpcMutationOptions(debtsAddOptions, {
				onSuccess: ({ id }) =>
					navigate({ to: "/debts/$id", params: { id }, replace: true }),
			}),
		),
	);

	const defaultValues: Partial<Form> = {
		note: "",
		direction: "+",
		timestamp: getNow.plainDate(),
		userId: undefined,
	};

	const form = useAppForm({
		defaultValues: defaultValues as Form,
		validators: {
			onMount: formSchema,
			onChange: formSchema,
			onSubmit: formSchema,
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
			<PageHeader startContent={<BackLink to="/debts" />}>
				{t("add.title")}
			</PageHeader>
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
								label={t("add.form.amount.label")}
								isDisabled={addMutation.isPending}
								errorMessage={
									field.state.meta.isDirty
										? field.state.meta.errors
												.filter(isNonNullish)
												.map((error) => error.message)
												.join("\n")
										: undefined
								}
								fractionDigits={debtAmountSchemaDecimal}
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
					<form.AppField
						name="userId"
						listeners={{
							onMount: ({ fieldApi }) => {
								if (userId) {
									fieldApi.setValue(userId);
								}
							},
							onChange: ({ value }) => setUserId(value),
						}}
					>
						{(field) => (
							<UsersSuggest
								selected={field.state.value}
								isDisabled={addMutation.isPending}
								onUserClick={(nextUserId) => {
									if (nextUserId === field.state.value) {
										form.resetField("userId");
										// Unfortunately, resetting field doesn't emit a listener event
										setUserId(undefined);
									} else {
										field.setValue(nextUserId);
									}
								}}
								closeOnSelect
							/>
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
								label={t("add.form.note.label")}
								value={field.state.value}
								onValueChange={field.setValue}
								name={field.name}
								onBlur={field.handleBlur}
								isRequired
								mutation={addMutation}
								fieldError={
									field.state.meta.isDirty ? field.state.meta.errors : undefined
								}
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
								{t("add.form.submitButton")}
							</Button>
						)}
					</form.Subscribe>
				</form.Form>
			</form.AppForm>
		</>
	);
};
