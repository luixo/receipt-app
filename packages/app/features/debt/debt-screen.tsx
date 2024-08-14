import React from "react";

import { useParams, useRouter } from "solito/navigation";

import { CurrenciesPicker } from "~app/components/app/currencies-picker";
import { DebtControlButtons } from "~app/components/app/debt-control-buttons";
import { DebtSyncStatus } from "~app/components/app/debt-sync-status";
import { LoadableUser } from "~app/components/app/loadable-user";
import { SignButtonGroup } from "~app/components/app/sign-button-group";
import { DateInput } from "~app/components/date-input";
import { QueryErrorMessage } from "~app/components/error-message";
import { PageHeader } from "~app/components/page-header";
import { RemoveButton } from "~app/components/remove-button";
import { useBooleanState } from "~app/hooks/use-boolean-state";
import { useFormattedCurrency } from "~app/hooks/use-formatted-currency";
import { useSingleInput } from "~app/hooks/use-single-input";
import { useTrpcMutationOptions } from "~app/hooks/use-trpc-mutation-options";
import type { TRPCQueryOutput, TRPCQuerySuccessResult } from "~app/trpc";
import { trpc } from "~app/trpc";
import type { CurrencyCode } from "~app/utils/currency";
import { debtAmountSchema, debtNoteSchema } from "~app/utils/validation";
import { Button, Input, Link, Spinner } from "~components";
import { ReceiptIcon } from "~components/icons";
import type { ReceiptsId } from "~db/models";
import * as mutations from "~mutations";
import type { AppPage } from "~utils/next";

type Debt = TRPCQueryOutput<"debts.get">;

type CurrencyProps = {
	debt: Debt;
	isLoading: boolean;
};

const DebtCurrencyInput: React.FC<CurrencyProps> = ({ debt, isLoading }) => {
	const currency = useFormattedCurrency(debt.currencyCode);
	const [
		isModalOpen,
		{ switchValue: switchModalOpen, setTrue: openModal, setFalse: closeModal },
	] = useBooleanState();

	const updateReceiptMutation = trpc.debts.update.useMutation(
		useTrpcMutationOptions(mutations.debts.update.options, { context: debt }),
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
	const topCurrenciesQuery = trpc.currency.topDebts.useQuery();

	return (
		<>
			<Button
				variant="light"
				onClick={openModal}
				isDisabled={isLoading}
				isLoading={updateReceiptMutation.isPending}
				isIconOnly
			>
				{currency}
			</Button>
			<CurrenciesPicker
				onChange={saveCurrencyCode}
				modalOpen={isModalOpen}
				switchModalOpen={switchModalOpen}
				topCurrenciesQuery={topCurrenciesQuery}
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
	const {
		bindings,
		state: inputState,
		getNumberValue,
		setValue,
	} = useSingleInput({
		initialValue: absoluteAmount,
		schema: debtAmountSchema,
		type: "number",
	});
	React.useEffect(
		() => setValue(Math.abs(debt.amount)),
		[debt.amount, setValue],
	);

	const updateMutation = trpc.debts.update.useMutation(
		useTrpcMutationOptions(mutations.debts.update.options, { context: debt }),
	);
	const updateAmount = React.useCallback(
		(amount: number) => {
			if (amount !== absoluteAmount) {
				const currentSign = debt.amount >= 0 ? 1 : -1;
				updateMutation.mutate({
					id: debt.id,
					update: { amount: amount * currentSign },
				});
			}
		},
		[updateMutation, debt.id, debt.amount, absoluteAmount],
	);

	return (
		<Input
			{...bindings}
			value={bindings.value.toString()}
			aria-label="Debt amount"
			mutation={updateMutation}
			fieldError={inputState.error}
			isDisabled={isLoading}
			saveProps={{
				title: "Save debt amount",
				isHidden: absoluteAmount === getNumberValue(),
				onClick: () => updateAmount(getNumberValue()),
			}}
			endContent={<DebtCurrencyInput debt={debt} isLoading={isLoading} />}
			variant="bordered"
		/>
	);
};

type DateProps = {
	debt: Debt;
	isLoading: boolean;
};

const DebtDateInput: React.FC<DateProps> = ({ debt, isLoading }) => {
	const updateMutation = trpc.debts.update.useMutation(
		useTrpcMutationOptions(mutations.debts.update.options, { context: debt }),
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
			mutation={updateMutation}
			timestamp={debt.timestamp}
			isDisabled={isLoading}
			onUpdate={saveDate}
		/>
	);
};

type NoteProps = {
	debt: Debt;
	isLoading: boolean;
};

const DebtNoteInput: React.FC<NoteProps> = ({ debt, isLoading }) => {
	const {
		bindings,
		state: inputState,
		getValue,
		setValue,
	} = useSingleInput({
		initialValue: debt.note,
		schema: debtNoteSchema,
	});

	const updateMutation = trpc.debts.update.useMutation(
		useTrpcMutationOptions(mutations.debts.update.options, { context: debt }),
	);
	const saveNote = React.useCallback(
		(nextNote: string) => {
			if (debt.note === nextNote) {
				return;
			}
			updateMutation.mutate(
				{ id: debt.id, update: { note: nextNote } },
				{ onSuccess: () => setValue(nextNote) },
			);
		},
		[updateMutation, debt.id, debt.note, setValue],
	);

	return (
		<Input
			{...bindings}
			aria-label="Debt note"
			mutation={updateMutation}
			fieldError={inputState.error}
			isDisabled={isLoading}
			saveProps={{
				title: "Save debt note",
				isHidden: debt.note === getValue(),
				onClick: () => saveNote(getValue()),
			}}
		/>
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
	const router = useRouter();
	const removeMutation = trpc.debts.remove.useMutation(
		useTrpcMutationOptions(mutations.debts.remove.options, {
			context: debt,
			onSuccess: () => router.replace(`/debts/user/${debt.userId}`),
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
		useTrpcMutationOptions(mutations.debts.update.options, { context: debt }),
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
	const currency = useFormattedCurrency(debt.currencyCode);

	return (
		<>
			<PageHeader
				backHref={`/debts/user/${debt.userId}`}
				aside={<DebtControlButtons debt={debt} />}
				endContent={
					<>
						<DebtSyncStatus debt={debt} size="lg" />
						{debt.receiptId ? (
							<DebtReceiptLink receiptId={debt.receiptId} />
						) : null}
					</>
				}
			>
				{`${debt.amount} ${currency} debt`}
			</PageHeader>
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

export const DebtScreen: AppPage = () => {
	const { id } = useParams<{ id: string }>();
	const query = trpc.debts.get.useQuery({ id });
	if (query.status === "pending") {
		return (
			<>
				<PageHeader>Debt</PageHeader>
				<Spinner size="lg" />
			</>
		);
	}
	if (query.status === "error") {
		return <QueryErrorMessage query={query} />;
	}
	return <DebtInner query={query} />;
};
