import React from "react";
import { View } from "react-native";

import { z } from "zod";

import { CurrenciesPicker } from "~app/components/app/currencies-picker";
import { DebtControlButtons } from "~app/components/app/debt-control-buttons";
import { DebtSyncStatus } from "~app/components/app/debt-sync-status";
import { LoadableUser } from "~app/components/app/loadable-user";
import { SignButtonGroup } from "~app/components/app/sign-button-group";
import { SkeletonUser } from "~app/components/app/user";
import { DateInput, SkeletonDateInput } from "~app/components/date-input";
import { QueryErrorMessage } from "~app/components/error-message";
import { BackLink, PageHeader } from "~app/components/page-header";
import {
	RemoveButton,
	RemoveButtonSkeleton,
} from "~app/components/remove-button";
import { useBooleanState } from "~app/hooks/use-boolean-state";
import { useLocale } from "~app/hooks/use-locale";
import { useNavigate } from "~app/hooks/use-navigation";
import { useTrpcMutationOptions } from "~app/hooks/use-trpc-mutation-options";
import type { TRPCQueryOutput, TRPCQuerySuccessResult } from "~app/trpc";
import { trpc } from "~app/trpc";
import {
	type CurrencyCode,
	formatCurrency,
	getCurrencySymbol,
} from "~app/utils/currency";
import { areDebtsSynced } from "~app/utils/debts";
import { useAppForm } from "~app/utils/forms";
import { debtAmountSchema, debtNoteSchema } from "~app/utils/validation";
import { Button } from "~components/button";
import { ReceiptIcon } from "~components/icons";
import { Input } from "~components/input";
import { Link } from "~components/link";
import { SaveButton } from "~components/save-button";
import { Spinner } from "~components/spinner";
import type { DebtsId, ReceiptsId, UsersId } from "~db/models";
import { options as debtsRemoveOptions } from "~mutations/debts/remove";
import { options as debtsUpdateOptions } from "~mutations/debts/update";
import { noop } from "~utils/fn";

type Debt = TRPCQueryOutput<"debts.get">;

type HeaderProps = {
	userId?: UsersId;
} & Omit<Partial<React.ComponentProps<typeof PageHeader>>, "startContent">;

const Header: React.FC<HeaderProps> = ({ userId, ...rest }) => (
	<PageHeader
		startContent={
			userId ? (
				<BackLink to="/debts/user/$id" params={{ id: userId }} />
			) : undefined
		}
		{...rest}
	/>
);

type CurrencyProps = {
	debt: Debt;
	isLoading: boolean;
};

const DebtCurrencyInput: React.FC<CurrencyProps> = ({ debt, isLoading }) => {
	const locale = useLocale();
	const [
		isModalOpen,
		{ switchValue: switchModalOpen, setTrue: openModal, setFalse: closeModal },
	] = useBooleanState();

	const updateReceiptMutation = trpc.debts.update.useMutation(
		useTrpcMutationOptions(debtsUpdateOptions, { context: { currDebt: debt } }),
	);
	const saveCurrencyCode = React.useCallback(
		(nextCurrencyCode: CurrencyCode) => {
			if (nextCurrencyCode === debt.currencyCode) {
				return;
			}
			closeModal();
			updateReceiptMutation.mutate({
				id: debt.id,
				update: { currencyCode: nextCurrencyCode },
			});
		},
		[updateReceiptMutation, debt.id, debt.currencyCode, closeModal],
	);

	return (
		<>
			<Button
				variant="light"
				onPress={openModal}
				isDisabled={isLoading}
				isLoading={updateReceiptMutation.isPending}
				isIconOnly
			>
				{getCurrencySymbol(locale, debt.currencyCode)}
			</Button>
			<CurrenciesPicker
				onChange={saveCurrencyCode}
				modalOpen={isModalOpen}
				switchModalOpen={switchModalOpen}
				topQueryOptions={{ type: "debts" }}
			/>
		</>
	);
};

type AmountProps = {
	debt: Debt;
	isLoading: boolean;
};

const DebtAmountInput: React.FC<AmountProps> = ({ debt, isLoading }) => {
	const absoluteAmount = Math.abs(debt.amount);

	const updateMutation = trpc.debts.update.useMutation(
		useTrpcMutationOptions(debtsUpdateOptions, { context: { currDebt: debt } }),
	);
	const form = useAppForm({
		defaultValues: { value: absoluteAmount },
		validators: { onChange: z.object({ value: debtAmountSchema }) },
		onSubmit: ({ value }) => {
			const currentSign = debt.amount >= 0 ? 1 : -1;
			updateMutation.mutate({
				id: debt.id,
				update: { amount: value.value * currentSign },
			});
		},
	});

	return (
		<form.AppField name="value">
			{(field) => (
				<field.NumberField
					value={field.state.value}
					onValueChange={field.setValue}
					name={field.name}
					onBlur={field.handleBlur}
					fieldError={
						field.state.meta.isDirty ? field.state.meta.errors : undefined
					}
					aria-label="Debt amount"
					mutation={updateMutation}
					isDisabled={isLoading}
					minValue={0}
					endContent={
						<View className="flex gap-2">
							<DebtCurrencyInput debt={debt} isLoading={isLoading} />
							{absoluteAmount === field.state.value ? null : (
								<form.Subscribe selector={(state) => state.canSubmit}>
									{(canSubmit) => (
										<SaveButton
											title="Save debt amount"
											onPress={() => {
												void field.form.handleSubmit();
											}}
											isLoading={updateMutation.isPending}
											isDisabled={isLoading || !canSubmit}
										/>
									)}
								</form.Subscribe>
							)}
						</View>
					}
					variant="bordered"
				/>
			)}
		</form.AppField>
	);
};

type DateProps = {
	debt: Debt;
	isLoading: boolean;
};

const DebtDateInput: React.FC<DateProps> = ({
	debt,
	isLoading: isDisabled,
}) => {
	const updateMutation = trpc.debts.update.useMutation(
		useTrpcMutationOptions(debtsUpdateOptions, { context: { currDebt: debt } }),
	);

	const saveDate = React.useCallback(
		(nextDate: Date) => {
			// TODO: add date-fns comparison of dates
			if (nextDate.valueOf() === debt.timestamp.valueOf()) {
				return;
			}
			updateMutation.mutate({
				id: debt.id,
				update: { timestamp: nextDate },
			});
		},
		[updateMutation, debt.id, debt.timestamp],
	);

	return (
		<DateInput
			value={debt.timestamp}
			onValueChange={saveDate}
			mutation={updateMutation}
			isDisabled={isDisabled}
		/>
	);
};

type NoteProps = {
	debt: Debt;
	isLoading: boolean;
};

const DebtNoteInput: React.FC<NoteProps> = ({ debt, isLoading }) => {
	const updateMutation = trpc.debts.update.useMutation(
		useTrpcMutationOptions(debtsUpdateOptions, { context: { currDebt: debt } }),
	);
	const form = useAppForm({
		defaultValues: { value: debt.note },
		validators: { onChange: z.object({ value: debtNoteSchema }) },
		onSubmit: ({ value }) => {
			updateMutation.mutate({ id: debt.id, update: { note: value.value } });
		},
	});

	return (
		<form.AppField name="value">
			{(field) => (
				<field.TextField
					value={field.state.value}
					onValueChange={field.setValue}
					name={field.name}
					onBlur={field.handleBlur}
					fieldError={
						field.state.meta.isDirty ? field.state.meta.errors : undefined
					}
					aria-label="Debt note"
					mutation={updateMutation}
					isDisabled={isLoading}
					multiline
					endContent={
						debt.note === field.state.value ? null : (
							<form.Subscribe selector={(state) => state.canSubmit}>
								{(canSubmit) => (
									<SaveButton
										title="Save debt note"
										onPress={() => {
											void field.form.handleSubmit();
										}}
										isLoading={updateMutation.isPending}
										isDisabled={isLoading || !canSubmit}
									/>
								)}
							</form.Subscribe>
						)
					}
				/>
			)}
		</form.AppField>
	);
};

type LinkProps = {
	receiptId: ReceiptsId;
};

const DebtReceiptLink: React.FC<LinkProps> = ({ receiptId }) => (
	<Button
		as={Link}
		href={`/receipts/${receiptId}`}
		variant="bordered"
		color="success"
		isIconOnly
	>
		<ReceiptIcon size={24} />
	</Button>
);

type RemoveButtonProps = {
	debt: Debt;
	setLoading: (nextLoading: boolean) => void;
} & Omit<React.ComponentProps<typeof RemoveButton>, "mutation" | "onRemove">;

const DebtRemoveButton: React.FC<RemoveButtonProps> = ({
	debt,
	setLoading,
	...props
}) => {
	const navigate = useNavigate();
	const removeMutation = trpc.debts.remove.useMutation(
		useTrpcMutationOptions(debtsRemoveOptions, {
			context: {
				debt,
				areDebtsSynced: debt.their ? areDebtsSynced(debt, debt.their) : false,
			},
			onSuccess: () =>
				navigate({
					to: "/debts/user/$id",
					replace: true,
					params: { id: debt.userId },
				}),
		}),
	);
	React.useEffect(
		() => setLoading(removeMutation.isPending),
		[removeMutation.isPending, setLoading],
	);
	const removeDebt = React.useCallback(
		() => removeMutation.mutate({ id: debt.id }),
		[removeMutation, debt.id],
	);

	return (
		<RemoveButton
			mutation={removeMutation}
			onRemove={removeDebt}
			subtitle="This will remove debt forever"
			noConfirm={debt.amount === 0}
			{...props}
		>
			Remove debt
		</RemoveButton>
	);
};

type SignGroupProps = {
	debt: Debt;
	disabled: boolean;
};

export const DebtSignButtonGroup: React.FC<SignGroupProps> = ({
	debt,
	disabled,
}) => {
	const updateMutation = trpc.debts.update.useMutation(
		useTrpcMutationOptions(debtsUpdateOptions, { context: { currDebt: debt } }),
	);
	const setDirection = React.useCallback(
		(direction: "+" | "-") => {
			if (
				(direction === "+" && debt.amount >= 0) ||
				(direction === "-" && debt.amount < 0)
			) {
				return;
			}
			return updateMutation.mutate({
				id: debt.id,
				update: { amount: debt.amount * -1 },
			});
		},
		[updateMutation, debt.id, debt.amount],
	);
	return (
		<SignButtonGroup
			disabled={disabled}
			isLoading={updateMutation.isPending}
			onUpdate={setDirection}
			direction={debt.amount >= 0 ? "+" : "-"}
		/>
	);
};

type InnerProps = {
	query: TRPCQuerySuccessResult<"debts.get">;
};

export const DebtInner: React.FC<InnerProps> = ({ query }) => {
	const debt = query.data;
	const [isRemoving, setRemoving] = React.useState(false);
	const locale = useLocale();
	const userQuery = trpc.users.get.useQuery({ id: debt.userId });

	return (
		<>
			<Header
				userId={debt.userId}
				aside={<DebtControlButtons debt={debt} />}
				endContent={
					<>
						{userQuery.status === "success" &&
						userQuery.data.connectedAccount ? (
							<DebtSyncStatus debt={debt} theirDebt={debt.their} size="lg" />
						) : null}
						{debt.receiptId ? (
							<DebtReceiptLink receiptId={debt.receiptId} />
						) : null}
					</>
				}
			>
				{`${formatCurrency(locale, debt.currencyCode, debt.amount)} debt`}
			</Header>
			<LoadableUser className="self-start" id={debt.userId} />
			<DebtSignButtonGroup debt={debt} disabled={isRemoving} />
			<DebtAmountInput debt={debt} isLoading={isRemoving} />
			<DebtDateInput debt={debt} isLoading={isRemoving} />
			<DebtNoteInput debt={debt} isLoading={isRemoving} />
			<DebtRemoveButton
				className="self-end"
				debt={debt}
				setLoading={setRemoving}
			/>
		</>
	);
};

export const DebtScreen: React.FC<{ id: DebtsId }> = ({ id }) => {
	const query = trpc.debts.get.useQuery({ id });
	switch (query.status) {
		case "pending":
			return (
				<>
					<Header>Loading debt ...</Header>
					<SkeletonUser className="self-start" />
					<SignButtonGroup disabled isLoading onUpdate={noop} direction="+" />
					<Input
						startContent={<Spinner size="sm" />}
						aria-label="Debt amount"
						isDisabled
						variant="bordered"
						endContent="$"
					/>
					<SkeletonDateInput />
					<Input
						aria-label="Debt note"
						isDisabled
						startContent={<Spinner size="sm" />}
						multiline
					/>
					<RemoveButtonSkeleton className="self-end">
						Remove debt
					</RemoveButtonSkeleton>
				</>
			);
		case "error":
			return <QueryErrorMessage query={query} />;
		case "success":
			return <DebtInner query={query} />;
	}
};
