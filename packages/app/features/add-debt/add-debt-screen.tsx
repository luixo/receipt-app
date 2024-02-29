import React from "react";

import { zodResolver } from "@hookform/resolvers/zod";
import type { UseFormReturn } from "react-hook-form";
import { useForm } from "react-hook-form";
import { useRouter, useSearchParams } from "solito/navigation";
import { z } from "zod";

import { CurrencyInput } from "~app/components/app/currency-input";
import {
	type Direction,
	SignButtonGroup,
} from "~app/components/app/sign-button-group";
import { UsersSuggest } from "~app/components/app/users-suggest";
import { DateInput } from "~app/components/date-input";
import { PageHeader } from "~app/components/page-header";
import { EmailVerificationCard } from "~app/features/email-verification/email-verification-card";
import { useInputController } from "~app/hooks/use-input-controller";
import { useTrpcMutationOptions } from "~app/hooks/use-trpc-mutation-options";
import { trpc } from "~app/trpc";
import type { CurrencyCode } from "~app/utils/currency";
import {
	currencyCodeSchema,
	debtAmountSchema,
	debtNoteSchema,
	userIdSchema,
} from "~app/utils/validation";
import { Button, Input } from "~components";
import type { UsersId } from "~db";
import * as mutations from "~mutations";
import { getToday } from "~utils";
import type { AppPage } from "~web/types/page";

type Form = {
	amount: number;
	direction: Direction;
	currencyCode: CurrencyCode;
	userId: UsersId;
	note: string;
	timestamp: Date;
};

type NoteProps = {
	form: UseFormReturn<Form>;
	isLoading: boolean;
};

const DebtNoteInput: React.FC<NoteProps> = ({ form, isLoading }) => {
	const { bindings, state: inputState } = useInputController({
		name: "note",
		form,
	});

	return (
		<Input
			{...bindings}
			required
			label="Debt note"
			isDisabled={isLoading}
			fieldError={inputState.error}
		/>
	);
};

type DateProps = {
	form: UseFormReturn<Form>;
	isLoading: boolean;
};

const DebtDateInput: React.FC<DateProps> = ({ form, isLoading }) => {
	const onDateUpdate = React.useCallback(
		(date: Date) => form.setValue("timestamp", date, { shouldValidate: true }),
		[form],
	);
	return (
		<DateInput
			timestamp={form.getValues("timestamp")}
			isDisabled={isLoading}
			onUpdate={onDateUpdate}
			updateOnChange
		/>
	);
};

type AmountProps = {
	form: UseFormReturn<Form>;
	isLoading: boolean;
};

const DebtAmountInput: React.FC<AmountProps> = ({ form, isLoading }) => {
	const { bindings, state: inputState } = useInputController({
		form,
		name: "amount",
		type: "number",
	});

	return (
		<Input
			{...bindings}
			required
			type="number"
			min="0"
			label="Amount"
			isDisabled={isLoading}
			fieldError={inputState.error}
		/>
	);
};

export const AddDebtScreen: AppPage = () => {
	const searchParams = useSearchParams<{ userId: UsersId }>();
	const userId = searchParams?.get("userId");

	const router = useRouter();

	const addMutation = trpc.debts.add.useMutation(
		useTrpcMutationOptions(mutations.debts.add.options, {
			onSuccess: ({ id }) => router.replace(`/debts/${id}`),
		}),
	);

	const form = useForm<Form>({
		mode: "onChange",
		reValidateMode: "onChange",
		resolver: zodResolver(
			z.object({
				amount: z.preprocess(Number, debtAmountSchema),
				direction: z.union([z.literal("-"), z.literal("+")]),
				currencyCode: currencyCodeSchema,
				userId: userIdSchema,
				note: debtNoteSchema,
				timestamp: z.date(),
			}),
		),
		defaultValues: {
			note: "",
			direction: "+",
			timestamp: getToday(),
			userId: userId || undefined,
			// TODO: figure out how to put a default value to a number-typed field
			// Removing this will result in error of uncontrolled field becoming controlled field
			amount: "" as unknown as number,
		},
	});
	const onUserClick = React.useCallback(
		(nextUserId: UsersId) =>
			form.setValue("userId", nextUserId, { shouldValidate: true }),
		[form],
	);
	const onDirectionUpdate = React.useCallback(
		(direction: Direction) => form.setValue("direction", direction),
		[form],
	);
	const onSubmit = React.useCallback(
		(values: Form) =>
			addMutation.mutate({
				note: values.note,
				currencyCode: values.currencyCode,
				userId: values.userId,
				amount: values.amount * (values.direction === "+" ? 1 : -1),
				timestamp: values.timestamp,
			}),
		[addMutation],
	);
	const topCurrenciesQuery = trpc.currency.topDebts.useQuery();

	return (
		<>
			<PageHeader backHref="/debts">Add debt</PageHeader>
			<EmailVerificationCard />
			<SignButtonGroup
				isLoading={addMutation.isPending}
				onUpdate={onDirectionUpdate}
				direction={form.watch("direction")}
			/>
			<DebtAmountInput form={form} isLoading={addMutation.isPending} />
			<CurrencyInput
				form={form}
				isLoading={addMutation.isPending}
				topCurrenciesQuery={topCurrenciesQuery}
			/>
			<UsersSuggest
				selected={form.watch("userId")}
				isDisabled={addMutation.isPending}
				options={React.useMemo(() => ({ type: "debts" }), [])}
				onUserClick={onUserClick}
				closeOnSelect
			/>
			<DebtDateInput form={form} isLoading={addMutation.isPending} />
			<DebtNoteInput form={form} isLoading={addMutation.isPending} />
			<Button
				className="mt-4"
				color="primary"
				onClick={form.handleSubmit(onSubmit)}
				isDisabled={!form.formState.isValid || addMutation.isPending}
				isLoading={addMutation.isPending}
			>
				Add debt
			</Button>
		</>
	);
};
