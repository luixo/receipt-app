import React from "react";

import { useMutation, useSuspenseQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import z from "zod";

import { CurrenciesPicker } from "~app/components/app/currencies-picker";
import { SkeletonCurrencyInput } from "~app/components/app/currency-input";
import { DebtSyncStatus } from "~app/components/app/debt-sync-status";
import { LoadableUser } from "~app/components/app/loadable-user";
import {
	SignButtonGroup,
	SkeletonSignButtonGroup,
} from "~app/components/app/sign-button-group";
import { SkeletonUser } from "~app/components/app/user";
import { PageHeader } from "~app/components/page-header";
import {
	RemoveButton,
	RemoveButtonSkeleton,
} from "~app/components/remove-button";
import { suspendedFallback } from "~app/components/suspense-wrapper";
import { NavigationContext } from "~app/contexts/navigation-context";
import { useBooleanState } from "~app/hooks/use-boolean-state";
import { useLocale } from "~app/hooks/use-locale";
import { useTrpcMutationOptions } from "~app/hooks/use-trpc-mutation-options";
import {
	type CurrencyCode,
	formatCurrency,
	getCurrencySymbol,
} from "~app/utils/currency";
import { useAppForm } from "~app/utils/forms";
import { useTRPC } from "~app/utils/trpc";
import {
	debtAmountSchema,
	debtAmountSchemaDecimal,
	debtNoteSchema,
} from "~app/utils/validation";
import { Button } from "~components/button";
import { DateInput } from "~components/date-input";
import { Icon } from "~components/icons";
import { BackLink, ButtonLink } from "~components/link";
import { SaveButton } from "~components/save-button";
import { SkeletonDateInput } from "~components/skeleton-date-input";
import { SkeletonInput } from "~components/skeleton-input";
import { SkeletonNumberInput } from "~components/skeleton-number-input";
import { View } from "~components/view";
import type { DebtId, UserId } from "~db/ids";
import { options as debtsRemoveOptions } from "~mutations/debts/remove";
import { options as debtsUpdateOptions } from "~mutations/debts/update";
import type { Temporal } from "~utils/date";
import { areEqual } from "~utils/date";

import { DebtControlButtons } from "./debt-control-buttons";

type HeaderProps = {
	userId?: UserId;
} & Omit<React.ComponentProps<typeof PageHeader>, "startContent">;

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

const DebtCurrencyInput = suspendedFallback<{
	debtId: DebtId;
	isLoading: boolean;
}>(
	({ debtId, isLoading }) => {
		const trpc = useTRPC();
		const { data: debt } = useSuspenseQuery(
			trpc.debts.get.queryOptions({ id: debtId }),
		);
		const locale = useLocale();
		const [
			isModalOpen,
			{
				switchValue: switchModalOpen,
				setTrue: openModal,
				setFalse: closeModal,
			},
		] = useBooleanState();

		const updateReceiptMutation = useMutation(
			trpc.debts.update.mutationOptions(
				useTrpcMutationOptions(debtsUpdateOptions, {
					context: { currDebt: debt },
				}),
			),
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
	},
	<SkeletonCurrencyInput />,
);

const DebtAmountInput = suspendedFallback<{
	debtId: DebtId;
	isLoading: boolean;
}>(
	({ debtId, isLoading }) => {
		const { t } = useTranslation("debts");
		const trpc = useTRPC();
		const { data: debt } = useSuspenseQuery(
			trpc.debts.get.queryOptions({ id: debtId }),
		);
		const absoluteAmount = Math.abs(debt.amount);

		const updateMutation = useMutation(
			trpc.debts.update.mutationOptions(
				useTrpcMutationOptions(debtsUpdateOptions, {
					context: { currDebt: debt },
				}),
			),
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
						aria-label={t("debt.form.amount.label")}
						mutation={updateMutation}
						isDisabled={isLoading}
						minValue={0}
						fractionDigits={debtAmountSchemaDecimal}
						endContent={
							<View className="flex flex-row gap-2">
								<DebtCurrencyInput debtId={debtId} isLoading={isLoading} />
								{absoluteAmount === field.state.value ? null : (
									<form.Subscribe selector={(state) => state.canSubmit}>
										{(canSubmit) => (
											<SaveButton
												title={t("debt.form.amount.saveButton")}
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
	},
	() => {
		const { t } = useTranslation("debts");
		return (
			<SkeletonNumberInput
				label={t("debt.form.amount.label")}
				variant="bordered"
				endContent={
					<Button variant="light" isIconOnly>
						USD
					</Button>
				}
			/>
		);
	},
);

const DebtDateInput = suspendedFallback<{
	debtId: DebtId;
	isLoading: boolean;
}>(
	({ debtId, isLoading: isDisabled }) => {
		const trpc = useTRPC();
		const { data: debt } = useSuspenseQuery(
			trpc.debts.get.queryOptions({ id: debtId }),
		);
		const updateMutation = useMutation(
			trpc.debts.update.mutationOptions(
				useTrpcMutationOptions(debtsUpdateOptions, {
					context: { currDebt: debt },
				}),
			),
		);

		const saveDate = React.useCallback(
			(nextDate: Temporal.PlainDate) => {
				if (areEqual.plainDate(nextDate, debt.timestamp)) {
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
	},
	<SkeletonDateInput />,
);

const DebtNoteInput = suspendedFallback<{
	debtId: DebtId;
	isLoading: boolean;
}>(
	({ debtId, isLoading }) => {
		const { t } = useTranslation("debts");
		const trpc = useTRPC();
		const { data: debt } = useSuspenseQuery(
			trpc.debts.get.queryOptions({ id: debtId }),
		);
		const updateMutation = useMutation(
			trpc.debts.update.mutationOptions(
				useTrpcMutationOptions(debtsUpdateOptions, {
					context: { currDebt: debt },
				}),
			),
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
						aria-label={t("debt.form.note.label")}
						mutation={updateMutation}
						isDisabled={isLoading}
						multiline
						endContent={
							debt.note === field.state.value ? null : (
								<form.Subscribe selector={(state) => state.canSubmit}>
									{(canSubmit) => (
										<SaveButton
											title={t("debt.form.note.saveButton")}
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
	},
	() => {
		const { t } = useTranslation("debts");
		return <SkeletonInput aria-label={t("debt.form.note.label")} multiline />;
	},
);

type RemoveButtonProps = {
	debtId: DebtId;
	setLoading: (nextLoading: boolean) => void;
} & Omit<React.ComponentProps<typeof RemoveButton>, "mutation" | "onRemove">;

const DebtRemoveButton: React.FC<RemoveButtonProps> = suspendedFallback(
	({ setLoading, debtId, ...props }) => {
		const { t } = useTranslation("debts");
		const trpc = useTRPC();
		const { data: debt } = useSuspenseQuery(
			trpc.debts.get.queryOptions({ id: debtId }),
		);
		const { useNavigate } = React.use(NavigationContext);
		const navigate = useNavigate();
		const removeMutation = useMutation(
			trpc.debts.remove.mutationOptions(
				useTrpcMutationOptions(debtsRemoveOptions, {
					context: { debt },
					onSuccess: () =>
						navigate({
							to: "/debts/user/$id",
							params: { id: debt.userId },
							replace: true,
						}),
				}),
			),
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
				subtitle={t("debt.remove.confirmSubtitle")}
				noConfirm={debt.amount === 0}
				{...props}
			>
				{t("debt.remove.button")}
			</RemoveButton>
		);
	},
	({ className }) => {
		const { t } = useTranslation("debts");
		return (
			<RemoveButtonSkeleton className={className}>
				{t("debt.remove.button")}
			</RemoveButtonSkeleton>
		);
	},
);

const DebtSignButtonGroup = suspendedFallback<{
	debtId: DebtId;
	disabled: boolean;
}>(
	({ debtId, disabled }) => {
		const trpc = useTRPC();
		const { data: debt } = useSuspenseQuery(
			trpc.debts.get.queryOptions({ id: debtId }),
		);
		const updateMutation = useMutation(
			trpc.debts.update.mutationOptions(
				useTrpcMutationOptions(debtsUpdateOptions, {
					context: { currDebt: debt },
				}),
			),
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
	},
	<SkeletonSignButtonGroup />,
);

const DebtHeader = suspendedFallback<{ debtId: DebtId }>(
	({ debtId }) => {
		const { t } = useTranslation("debts");
		const trpc = useTRPC();
		const locale = useLocale();
		const { data: debt } = useSuspenseQuery(
			trpc.debts.get.queryOptions({ id: debtId }),
		);
		const { data: user } = useSuspenseQuery(
			trpc.users.get.queryOptions({ id: debt.userId }),
		);
		return (
			<Header
				userId={debt.userId}
				aside={<DebtControlButtons debt={debt} />}
				endContent={
					<>
						{user.connectedAccount ? (
							<DebtSyncStatus debt={debt} theirDebt={debt.their} size="lg" />
						) : null}
						{debt.receiptId ? (
							<ButtonLink
								to="/receipts/$id"
								params={{ id: debt.receiptId }}
								variant="bordered"
								color="success"
								isIconOnly
							>
								<Icon name="receipt" className="size-6" />
							</ButtonLink>
						) : null}
					</>
				}
			>
				{t("debt.header", {
					amount: formatCurrency(locale, debt.currencyCode, debt.amount),
				})}
			</Header>
		);
	},
	() => {
		const { t } = useTranslation("debts");
		return <Header>{t("debt.loading")}</Header>;
	},
);

const DebtUser = suspendedFallback<{ debtId: DebtId }>(
	({ debtId }) => {
		const trpc = useTRPC();
		const { data: debt } = useSuspenseQuery(
			trpc.debts.get.queryOptions({ id: debtId }),
		);
		return <LoadableUser className="self-start" id={debt.userId} />;
	},
	<SkeletonUser className="self-start" />,
);

export const DebtScreen: React.FC<{
	id: DebtId;
}> = ({ id }) => {
	const [removing, setRemoving] = React.useState(false);

	return (
		<>
			<DebtHeader debtId={id} />
			<DebtUser debtId={id} />
			<DebtSignButtonGroup debtId={id} disabled={removing} />
			<DebtAmountInput debtId={id} isLoading={removing} />
			<DebtDateInput debtId={id} isLoading={removing} />
			<DebtNoteInput debtId={id} isLoading={removing} />
			<DebtRemoveButton
				className="self-end"
				debtId={id}
				setLoading={setRemoving}
			/>
		</>
	);
};
