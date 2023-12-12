import React from "react";

import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@nextui-org/react";
import { useForm } from "react-hook-form";
import { createParam } from "solito";
import { z } from "zod";

import { CurrencyInput } from "app/components/app/currency-input";
import type { Direction } from "app/components/app/sign-button-group";
import { SignButtonGroup } from "app/components/app/sign-button-group";
import { UsersSuggest } from "app/components/app/users-suggest";
import { PageHeader } from "app/components/page-header";
import { EmailVerificationCard } from "app/features/email-verification/email-verification-card";
import { useRouter } from "app/hooks/use-router";
import { useTrpcMutationOptions } from "app/hooks/use-trpc-mutation-options";
import { mutations } from "app/mutations";
import { trpc } from "app/trpc";
import { getToday } from "app/utils/date";
import {
	currencySchema,
	debtAmountSchema,
	debtNoteSchema,
	userItemSchema,
} from "app/utils/validation";
import type { UsersId } from "next-app/src/db/models";
import type { AppPage } from "next-app/types/page";

import { DebtAmountInput } from "./debt-amount-input";
import { DebtDateInput } from "./debt-date-input";
import { DebtNoteInput } from "./debt-note-input";
import type { Form } from "./types";

const { useParam } = createParam<{ userId: UsersId }>();

export const AddDebtScreen: AppPage = () => {
	const [userId] = useParam("userId");
	const userQuery = trpc.users.get.useQuery(
		{ id: userId || "unknown" },
		{ enabled: Boolean(userId) },
	);

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
				currency: currencySchema,
				user: userItemSchema,
				note: debtNoteSchema,
				timestamp: z.date(),
			}),
		),
		defaultValues: {
			note: "",
			direction: "+",
			timestamp: getToday(),
			// TODO: figure out how to put a default value to a number-typed field
			// Removing this will result in error of uncontrolled field becoming controlled field
			amount: "" as unknown as number,
		},
	});
	React.useEffect(() => {
		const user = userQuery.data;
		if (user && !form.getValues("user")) {
			form.setValue("user", {
				id: user.remoteId,
				name: user.name,
				publicName: user.publicName,
				connectedAccount: user.account,
			});
		}
	}, [userQuery.data, form]);
	const onUserClick = React.useCallback(
		(user: z.infer<typeof userItemSchema>) => form.setValue("user", user),
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
				currencyCode: values.currency.code,
				userId: values.user.id,
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
				selected={form.watch("user")}
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
