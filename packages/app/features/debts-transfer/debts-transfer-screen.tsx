import React from "react";
import { View } from "react-native";

import {
	hashKey,
	skipToken,
	useMutation,
	useQuery,
} from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { entries, isNonNullish, pullObject } from "remeda";
import { z } from "zod/v4";

import { CurrenciesPicker } from "~app/components/app/currencies-picker";
import { UsersSuggest } from "~app/components/app/users-suggest";
import { QueryErrorMessage } from "~app/components/error-message";
import { PageHeader } from "~app/components/page-header";
import { ShowResolvedDebtsOption } from "~app/features/settings/show-resolved-debts-option";
import { useBooleanState } from "~app/hooks/use-boolean-state";
import { useLocale } from "~app/hooks/use-locale";
import type { SearchParamState } from "~app/hooks/use-navigation";
import { useShowResolvedDebts } from "~app/hooks/use-show-resolved-debts";
import { useTrpcMutationOptions } from "~app/hooks/use-trpc-mutation-options";
import { useTrpcMutationStates } from "~app/hooks/use-trpc-mutation-state";
import type { TRPCQueryOutput, TRPCQuerySuccessResult } from "~app/trpc";
import { type CurrencyCode, getCurrencySymbol } from "~app/utils/currency";
import { useAppForm } from "~app/utils/forms";
import { useTRPC } from "~app/utils/trpc";
import {
	currencyCodeSchema,
	debtAmountSchema,
	debtAmountSchemaDecimal,
} from "~app/utils/validation";
import { Button } from "~components/button";
import { BackArrow, TrashBin } from "~components/icons";
import { BackLink } from "~components/link";
import { Spinner } from "~components/spinner";
import { Text } from "~components/text";
import { cn } from "~components/utils";
import type { UsersId } from "~db/models";
import { options as debtsAddOptions } from "~mutations/debts/add";
import { getNow } from "~utils/date";

const formSchema = z
	.record(currencyCodeSchema, debtAmountSchema.or(z.literal(0)))
	.refine(
		(record) =>
			entries(record).filter(
				([, sum]) => !Number.isNaN(sum) && Number.isFinite(sum) && sum !== 0,
			).length !== 0,
		{ message: "No non-zero transfers" },
	);
type Form = z.infer<typeof formSchema>;

/* eslint-disable @typescript-eslint/no-unnecessary-template-expression */
// Typescript is not as good with flavored types inside template literals
const transformCurrencyCode = (currencyCode: CurrencyCode): `${CurrencyCode}` =>
	currencyCode as `${CurrencyCode}`;
/* eslint-enable @typescript-eslint/no-unnecessary-template-expression */

type FormProps = {
	aggregatedDebts: { sum: number; currencyCode: CurrencyCode }[];
	shouldShowResolvedDebtsButton: boolean;
	fromUser: TRPCQueryOutput<"users.get">;
	toUser?: TRPCQueryOutput<"users.get">;
};

const DebtsListForm: React.FC<FormProps> = ({
	aggregatedDebts,
	shouldShowResolvedDebtsButton,
	fromUser,
	toUser,
}) => {
	const { t } = useTranslation("debts");
	const trpc = useTRPC();
	const [extraCurrencyCodes, setExtraCurrencyCodes] = React.useState<
		CurrencyCode[]
	>([]);
	const allCurrenciesWithSums = React.useMemo(
		() => [
			...aggregatedDebts,
			...extraCurrencyCodes.map((currencyCode) => ({
				currencyCode,
				sum: null,
			})),
		],
		[aggregatedDebts, extraCurrencyCodes],
	);
	const addMutation = useMutation(
		trpc.debts.add.mutationOptions(useTrpcMutationOptions(debtsAddOptions)),
	);
	const locale = useLocale();
	const [lastMutationTimestamps, setLastMutationTimestamps] = React.useState<
		string[]
	>([]);
	const form = useAppForm({
		defaultValues: pullObject(
			aggregatedDebts,
			(item) => item.currencyCode,
			() => 0,
		) satisfies Form,
		validators: {
			onMount: formSchema,
			onChange: formSchema,
			onSubmit: formSchema,
		},
		onSubmit: ({ value }) => {
			setLastMutationTimestamps(
				allCurrenciesWithSums.reduce<string[]>((acc, { currencyCode }) => {
					const amount = value[currencyCode] ?? 0;
					if (amount === 0) {
						return acc;
					}
					if (!toUser) {
						throw new Error(`Expected to have target user`);
					}
					const fromMutationVars = {
						note: t("transfer.defaultNoteTo", {
							user: toUser.publicName || toUser.name,
						}),
						currencyCode,
						userId: fromUser.id,
						amount: -amount,
						timestamp: getNow.plainDate(),
					};
					addMutation.mutate(fromMutationVars);
					const toMutationVars = {
						note: t("transfer.defaultNoteFrom", {
							user: fromUser.publicName || fromUser.name,
						}),
						currencyCode,
						userId: toUser.id,
						amount,
						timestamp: getNow.plainDate(),
					};
					addMutation.mutate(toMutationVars);
					return [
						...acc,
						hashKey([fromMutationVars]),
						hashKey([toMutationVars]),
					];
				}, []),
			);
		},
	});
	const lastMutationStates = useTrpcMutationStates<"debts.add">(
		trpc.debts.add.mutationKey(),
		(vars) => lastMutationTimestamps.includes(hashKey([vars])),
	);
	const setAllMax = React.useCallback(() => {
		allCurrenciesWithSums.forEach(({ currencyCode, sum }) => {
			if (sum !== null) {
				form.setFieldValue(transformCurrencyCode(currencyCode), sum);
			}
		});
	}, [allCurrenciesWithSums, form]);
	const [
		currencyModalOpen,
		{
			setTrue: openCurrencyModal,
			switchValue: switchCurrencyModal,
			setFalse: closeCurrencyModal,
		},
	] = useBooleanState();
	const onCurrencyChange = React.useCallback(
		(currencyCode: CurrencyCode) => {
			setExtraCurrencyCodes((codes) => [...codes, currencyCode]);
			form.setFieldValue(transformCurrencyCode(currencyCode), 0);
			closeCurrencyModal();
		},
		[closeCurrencyModal, form],
	);
	const hiddenCurrencies = React.useMemo(
		() => allCurrenciesWithSums.map(({ currencyCode }) => currencyCode),
		[allCurrenciesWithSums],
	);
	const removeExtraCurrencyCode = React.useCallback(
		(currencyCode: CurrencyCode) => {
			form.deleteField(transformCurrencyCode(currencyCode));
			setExtraCurrencyCodes((codes) =>
				codes.filter((code) => code !== currencyCode),
			);
		},
		[form],
	);

	const mutationPending = lastMutationStates.some(
		(mutation) => mutation.status === "pending",
	);
	const mutationError = lastMutationStates
		.map((mutation) => mutation.error)
		.find(isNonNullish);

	return (
		<>
			<form.AppForm>
				<form.Form className="flex flex-col gap-4">
					<View className="flex gap-2">
						{allCurrenciesWithSums.length === 0 ? (
							<Text>{t("transfer.form.noDebts")}</Text>
						) : (
							<>
								<View className="flex-row gap-4 self-end">
									{shouldShowResolvedDebtsButton ? (
										<ShowResolvedDebtsOption />
									) : null}
									<Button color="secondary" onPress={setAllMax}>
										{t("transfer.form.allMax")}
									</Button>
								</View>
								{allCurrenciesWithSums.map(({ currencyCode, sum }) => (
									<form.AppField
										key={currencyCode}
										name={transformCurrencyCode(currencyCode)}
									>
										{(field) => {
											const currencySymbol = getCurrencySymbol(
												locale,
												currencyCode,
											);
											return (
												<View className="flex items-center gap-2 sm:flex-row">
													<Text className="flex-[2]">{currencySymbol}</Text>
													<field.NumberField
														value={field.state.value}
														fractionDigits={debtAmountSchemaDecimal}
														formatOptions={{ signDisplay: "exceptZero" }}
														onValueChange={field.setValue}
														name={field.name}
														onBlur={field.handleBlur}
														fieldError={
															field.state.meta.isDirty
																? field.state.meta.errors
																: undefined
														}
														className="flex-[6]"
														aria-label={currencySymbol}
														color={
															!field.state.value
																? "default"
																: field.state.value > 0
																	? "success"
																	: "danger"
														}
														startContent={
															<View
																className={cn(
																	"size-4 rounded",
																	!field.state.value
																		? "bg-default"
																		: field.state.value > 0
																			? "bg-success"
																			: "bg-danger",
																	!field.state.value
																		? undefined
																		: "cursor-pointer",
																)}
																onClick={() =>
																	field.setValue((prevValue) => -prevValue)
																}
															/>
														}
														endContent={
															sum === null ? (
																<Button
																	onPress={() =>
																		removeExtraCurrencyCode(currencyCode)
																	}
																	color="danger"
																	isIconOnly
																>
																	<TrashBin className="shrink-0" size={24} />
																</Button>
															) : (
																<View
																	className="cursor-pointer"
																	onClick={() => field.setValue(sum)}
																>
																	<Text>{t("transfer.form.max")}</Text>
																</View>
															)
														}
													/>
												</View>
											);
										}}
									</form.AppField>
								))}
							</>
						)}
						<Button
							className="self-start"
							color="secondary"
							onPress={openCurrencyModal}
						>
							{t("transfer.form.addCurrencyButton")}
						</Button>
					</View>
					<form.Subscribe selector={(state) => state.canSubmit}>
						{(canSubmit) => (
							<Button
								color={mutationError ? "danger" : "primary"}
								isDisabled={
									!canSubmit ||
									mutationPending ||
									!toUser ||
									fromUser.id === toUser.id
								}
								isLoading={mutationPending}
								type="submit"
							>
								{mutationError
									? mutationError.message
									: t("transfer.form.submit")}
							</Button>
						)}
					</form.Subscribe>
				</form.Form>
			</form.AppForm>
			<CurrenciesPicker
				onChange={onCurrencyChange}
				modalOpen={currencyModalOpen}
				switchModalOpen={switchCurrencyModal}
				topQueryOptions={{ type: "debts" }}
				hiddenCurrencies={hiddenCurrencies}
			/>
		</>
	);
};

type DebtsProps = {
	query: TRPCQuerySuccessResult<"debts.getAllUser">;
} & Pick<FormProps, "fromUser" | "toUser">;

const DebtsList: React.FC<DebtsProps> = ({ query, fromUser, toUser }) => {
	const [showResolvedDebts] = useShowResolvedDebts();
	const nonResolvedDebts = query.data.filter((element) => element.sum !== 0);
	const debtRows = showResolvedDebts ? query.data : nonResolvedDebts;
	return (
		<DebtsListForm
			aggregatedDebts={debtRows}
			shouldShowResolvedDebtsButton={
				query.data.length !== nonResolvedDebts.length
			}
			fromUser={fromUser}
			toUser={toUser}
		/>
	);
};

export const DebtsTransferScreen: React.FC<{
	fromIdState: SearchParamState<"/debts/transfer", "from">;
	toIdState: SearchParamState<"/debts/transfer", "to">;
}> = ({ fromIdState: [fromId, setFromId], toIdState: [toId, setToId] }) => {
	const { t } = useTranslation("debts");
	const trpc = useTRPC();
	const fromUserQuery = useQuery(
		trpc.users.get.queryOptions(fromId ? { id: fromId } : skipToken),
	);
	const onFromClick = React.useCallback(
		(userId: UsersId) => {
			void setFromId(fromId === userId ? undefined : userId);
		},
		[fromId, setFromId],
	);
	const onToClick = React.useCallback(
		(userId: UsersId) => {
			void setToId(toId === userId ? undefined : userId);
		},
		[setToId, toId],
	);
	const toUserQuery = useQuery(
		trpc.users.get.queryOptions(toId ? { id: toId } : skipToken),
	);
	const fromUserDebts = useQuery(
		trpc.debts.getAllUser.queryOptions(fromId ? { userId: fromId } : skipToken),
	);

	return (
		<>
			<PageHeader
				startContent={
					fromId ? (
						<BackLink to="/debts/user/$id" params={{ id: fromId }} />
					) : (
						<BackLink to="/debts" />
					)
				}
			>
				{t("transfer.title")}
			</PageHeader>
			<View className="flex-row gap-2 self-center">
				<UsersSuggest
					label={t("transfer.form.from.label")}
					selected={fromId}
					onUserClick={onFromClick}
					closeOnSelect
					setUserNameToInput
					selectedProps={{ className: "flex flex-row gap-2 items-center" }}
				/>
				<BackArrow className="size-10 rotate-180" />
				<UsersSuggest
					label={t("transfer.form.to.label")}
					selected={toId}
					onUserClick={onToClick}
					closeOnSelect
					setUserNameToInput
					selectedProps={{ className: "flex flex-row gap-2 items-center" }}
				/>
			</View>
			{fromUserDebts.status === "pending" || !fromUserQuery.data ? (
				fromUserDebts.fetchStatus === "idle" ? null : (
					<Spinner />
				)
			) : fromUserDebts.status === "success" ? (
				<DebtsList
					key={fromId}
					query={fromUserDebts}
					fromUser={fromUserQuery.data}
					toUser={toUserQuery.data}
				/>
			) : (
				<QueryErrorMessage query={fromUserDebts} />
			)}
		</>
	);
};
