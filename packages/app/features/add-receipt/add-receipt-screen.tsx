import React from "react";
import { View } from "react-native";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import type { UseFormReturn } from "react-hook-form";
import { useRouter } from "solito/navigation";

import { CurrencyInput } from "~app/components/app/currency-input";
import { DateInput } from "~app/components/date-input";
import { PageHeader } from "~app/components/page-header";
import { EmailVerificationCard } from "~app/features/email-verification/email-verification-card";
import {
	actionsHooksContext,
	receiptContext,
} from "~app/features/receipt-components/context";
import { ReceiptItems } from "~app/features/receipt-components/receipt-items";
import { ReceiptParticipants } from "~app/features/receipt-components/receipt-participants";
import { useInputController } from "~app/hooks/use-input-controller";
import { useParticipants } from "~app/hooks/use-participants";
import { useTrpcMutationOptions } from "~app/hooks/use-trpc-mutation-options";
import { trpc } from "~app/trpc";
import { Button } from "~components/button";
import { Input } from "~components/input";
import { Text } from "~components/text";
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

	const formId = React.useId();
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
	});
	const actionsHooks = useActionsHooks(setItems, setRawParticipants);
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
			<receiptContext.Provider value={addReceiptContext}>
				<actionsHooksContext.Provider value={actionsHooks}>
					<form
						id={formId}
						onSubmit={form.handleSubmit(onSubmit)}
						className="flex flex-col gap-4"
					>
						<ReceiptNameInput
							form={form}
							isLoading={addReceiptMutation.isPending}
						/>
						<CurrencyInput
							form={form}
							isLoading={addReceiptMutation.isPending}
							topQueryOptions={{ type: "receipts" }}
						/>
						<ReceiptDateInput
							form={form}
							isLoading={addReceiptMutation.isPending}
						/>
					</form>
					<View className="flex flex-row justify-center gap-2">
						{rawParticipants.length === 0 ? null : (
							<Text className="text-xl leading-9">Participants</Text>
						)}
						<ReceiptParticipants />
					</View>
					<ReceiptItems />
					<Button
						className="mt-4"
						color="primary"
						isDisabled={!form.formState.isValid || addReceiptMutation.isPending}
						isLoading={addReceiptMutation.isPending}
						type="submit"
						form={formId}
					>
						Add receipt
					</Button>
				</actionsHooksContext.Provider>
			</receiptContext.Provider>
		</>
	);
};
