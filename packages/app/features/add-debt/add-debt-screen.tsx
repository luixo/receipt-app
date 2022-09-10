import React from "react";

import { zodResolver } from "@hookform/resolvers/zod";
import { Button, Loading, Spacer } from "@nextui-org/react";
import { useForm } from "react-hook-form";
import { createParam } from "solito";
import { useRouter } from "solito/router";
import { z } from "zod";

import { cache } from "app/cache";
import { CurrencyInput } from "app/components/app/currency-input";
import {
	Direction,
	SignButtonGroup,
} from "app/components/app/sign-button-group";
import { UsersSuggest } from "app/components/app/users-suggest";
import { MutationErrorMessage } from "app/components/error-message";
import { Header } from "app/components/header";
import { EmailVerificationCard } from "app/features/email-verification/email-verification-card";
import { useSubmitHandler } from "app/hooks/use-submit-handler";
import { useTrpcMutationOptions } from "app/hooks/use-trpc-mutation-options";
import { trpc } from "app/trpc";
import { getToday } from "app/utils/date";
import {
	currencyObjectSchema,
	clientDebtAmountSchema,
	debtNoteSchema,
	userItemSchema,
} from "app/utils/validation";
import { DebtsId, UsersId } from "next-app/src/db/models";
import { PageWithLayout } from "next-app/types/page";

import { DebtAmountInput } from "./debt-amount-input";
import { DebtDateInput } from "./debt-date-input";
import { DebtNoteInput } from "./debt-note-input";
import { Form } from "./types";

const { useParam } = createParam<{ userId: UsersId }>();

export const AddDebtScreen: PageWithLayout = () => {
	const [userId] = useParam("userId");
	const userQuery = trpc.users.get.useQuery(
		{ id: userId || "unknown" },
		{ enabled: Boolean(userId) }
	);

	const router = useRouter();

	const addMutation = trpc.debts.add.useMutation(
		useTrpcMutationOptions(cache.debts.add.mutationOptions)
	);

	const form = useForm<Form>({
		mode: "onChange",
		reValidateMode: "onChange",
		resolver: zodResolver(
			z.object({
				amount: z.preprocess(Number, clientDebtAmountSchema),
				direction: z.union([z.literal("-"), z.literal("+")]),
				currency: currencyObjectSchema,
				user: userItemSchema,
				note: debtNoteSchema,
				timestamp: z.date(),
			})
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
				connectedAccount:
					user.accountId && user.email
						? {
								id: user.accountId,
								email: user.email,
						  }
						: undefined,
			});
		}
	}, [userQuery.data, form]);
	const onUserClick = React.useCallback(
		(user: z.infer<typeof userItemSchema>) => form.setValue("user", user),
		[form]
	);
	const onDirectionUpdate = React.useCallback(
		(direction: Direction) => form.setValue("direction", direction),
		[form]
	);
	const onSubmit = useSubmitHandler<Form, DebtsId>(
		async (values) =>
			addMutation.mutateAsync({
				note: values.note,
				currency: values.currency.code,
				userId: values.user.id,
				amount: values.amount * (values.direction === "+" ? 1 : -1),
				timestamp: values.timestamp,
			}),
		[addMutation],
		React.useCallback((id: DebtsId) => router.replace(`/debts/${id}`), [router])
	);
	const topCurrenciesQuery = trpc.currency.topDebts.useQuery();

	return (
		<>
			<Header backHref="/debts">Add debt</Header>
			<EmailVerificationCard />
			{addMutation.status === "error" ? (
				<>
					<Spacer y={1} />
					<MutationErrorMessage mutation={addMutation} />
				</>
			) : null}
			<Spacer y={1} />
			<SignButtonGroup
				isLoading={addMutation.isLoading}
				onUpdate={onDirectionUpdate}
				direction={form.watch("direction")}
			/>
			<Spacer y={1} />
			<DebtAmountInput form={form} isLoading={addMutation.isLoading} />
			<Spacer y={1} />
			<CurrencyInput
				form={form}
				isLoading={addMutation.isLoading}
				topCurrenciesQuery={topCurrenciesQuery}
			/>
			<Spacer y={1} />
			<UsersSuggest
				selected={form.watch("user")}
				disabled={addMutation.isLoading}
				options={React.useMemo(() => ({ type: "debts" }), [])}
				onUserClick={onUserClick}
				closeOnSelect
			/>
			<Spacer y={1} />
			<DebtDateInput form={form} isLoading={addMutation.isLoading} />
			<Spacer y={1} />
			<DebtNoteInput form={form} isLoading={addMutation.isLoading} />
			<Spacer y={3} />
			<Button
				onClick={form.handleSubmit(onSubmit)}
				disabled={!form.formState.isValid || addMutation.isLoading}
			>
				{addMutation.isLoading ? <Loading size="sm" /> : "Add debt"}
			</Button>
		</>
	);
};
