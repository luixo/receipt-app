import React from "react";

import { useMutation } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { z } from "zod";

import { CurrencyInput } from "~app/components/app/currency-input";
import { PeersSuggest } from "~app/components/app/peers-suggest";
import { SignButtonGroup } from "~app/components/app/sign-button-group";
import type { Direction } from "~app/components/app/sign-button-group";
import { PageHeader } from "~app/components/page-header";
import { NavigationContext } from "~app/contexts/navigation-context";
import { EmailVerificationCard } from "~app/features/email-verification/email-verification-card";
import { useTrpcMutationOptions } from "~app/hooks/use-trpc-mutation-options";
import { useAppForm } from "~app/utils/forms";
import { getPathHooks } from "~app/utils/navigation";
import { useTRPC } from "~app/utils/trpc";
import {
	currencyCodeSchema,
	debtAmountSchema,
	debtAmountSchemaDecimal,
	debtNoteSchema,
	peerIdSchema,
} from "~app/utils/validation";
import { BackLink } from "~components/back-link";
import { Button } from "~components/button";
import { DateInput } from "~components/date-input";
import { options as debtsAddOptions } from "~mutations/debts/add";
import { temporalSchemas } from "~utils/temporal";

const formSchema = z.object({
	amount: debtAmountSchema,
	direction: z.literal(["-", "+"]),
	currencyCode: currencyCodeSchema,
	peerId: peerIdSchema,
	note: debtNoteSchema,
	timestamp: temporalSchemas.plainDate,
});

type Form = z.infer<typeof formSchema>;

export const AddDebtScreen = () => {
	const { useQueryState } = getPathHooks("/_protected/debts/add");
	const [peerId, setPeerId] = useQueryState("peerId");
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
		timestamp: Temporal.Now.plainDateISO(),
		peerId: undefined,
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
				peerId: value.peerId,
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
								fieldError={
									field.state.meta.isDirty ? field.state.meta.errors : undefined
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
						name="peerId"
						listeners={{
							onMount: ({ fieldApi }) => {
								if (peerId) {
									fieldApi.setValue(peerId);
								}
							},
							onChange: ({ value }) => setPeerId(value),
						}}
					>
						{(field) => (
							<PeersSuggest
								selected={field.state.value}
								isDisabled={addMutation.isPending}
								onPeerClick={(nextPeerId) => {
									if (nextPeerId === field.state.value) {
										form.resetField("peerId");
										// Unfortunately, resetting field doesn't emit a listener event
										setPeerId(undefined);
									} else {
										field.setValue(nextPeerId);
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
