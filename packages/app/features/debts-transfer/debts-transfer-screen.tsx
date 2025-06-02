import React from "react";
import { View } from "react-native";

import { skipToken } from "@tanstack/react-query";
import { entries, groupBy, isNonNullish, pullObject, values } from "remeda";
import { z } from "zod";

import { CurrenciesPicker } from "~app/components/app/currencies-picker";
import { UsersSuggest } from "~app/components/app/users-suggest";
import {
	GroupedQueryErrorMessage,
	QueryErrorMessage,
} from "~app/components/error-message";
import { BackLink, PageHeader } from "~app/components/page-header";
import { ShowResolvedDebtsOption } from "~app/features/settings/show-resolved-debts-option";
import { useAggregatedDebts } from "~app/hooks/use-aggregated-debts";
import { useBooleanState } from "~app/hooks/use-boolean-state";
import { useLocale } from "~app/hooks/use-locale";
import type { SearchParamState } from "~app/hooks/use-navigation";
import { useShowResolvedDebts } from "~app/hooks/use-show-resolved-debts";
import { useTrpcMutationOptions } from "~app/hooks/use-trpc-mutation-options";
import { useTrpcMutationStates } from "~app/hooks/use-trpc-mutation-state";
import type { TRPCQueryOutput, TRPCQuerySuccessResult } from "~app/trpc";
import { trpc } from "~app/trpc";
import { type CurrencyCode, getCurrencySymbol } from "~app/utils/currency";
import { useAppForm } from "~app/utils/forms";
import {
	currencyCodeSchema,
	debtAmountSchema,
	debtAmountSchemaDecimal,
} from "~app/utils/validation";
import { Button } from "~components/button";
import { BackArrow, TrashBin } from "~components/icons";
import { Spinner } from "~components/spinner";
import { Text } from "~components/text";
import { cn } from "~components/utils";
import type { UsersId } from "~db/models";
import { options as debtsAddOptions } from "~mutations/debts/add";

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
	const addMutation = trpc.debts.add.useMutation(
		useTrpcMutationOptions(debtsAddOptions),
	);
	const locale = useLocale();
	const [lastMutationTimestamps, setLastMutationTimestamps] = React.useState<
		number[]
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
				allCurrenciesWithSums.reduce<number[]>(
					(acc, { currencyCode }, index) => {
						const amount = value[currencyCode] ?? 0;
						if (amount === 0) {
							return acc;
						}
						if (!toUser) {
							throw new Error(`Expected to have target user`);
						}
						const fromTimestamp = new Date(Date.now() + index);
						addMutation.mutate({
							note: `Transferred to "${toUser.publicName || toUser.name}"`,
							currencyCode,
							userId: fromUser.id,
							amount: -amount,
							timestamp: fromTimestamp,
						});
						const toTimestamp = new Date(
							Date.now() + allCurrenciesWithSums.length + index,
						);
						addMutation.mutate({
							note: `Transferred from "${
								fromUser.publicName || fromUser.name
							}"`,
							currencyCode,
							userId: toUser.id,
							amount,
							timestamp: toTimestamp,
						});
						return [...acc, fromTimestamp.valueOf(), toTimestamp.valueOf()];
					},
					[],
				),
			);
		},
	});
	const lastMutationStates = useTrpcMutationStates<"debts.add">(
		trpc.debts.add,
		(vars) => lastMutationTimestamps.includes(vars.timestamp?.valueOf() ?? 0),
	);
	const setAllMax = React.useCallback(() => {
		allCurrenciesWithSums.forEach(({ currencyCode, sum }) => {
			if (sum !== null) {
				form.setFieldValue(currencyCode, sum);
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
			form.setFieldValue(currencyCode, 0);
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
			form.deleteField(currencyCode);
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
							<Text>No debts yet</Text>
						) : (
							<>
								<View className="flex-row gap-4 self-end">
									{shouldShowResolvedDebtsButton ? (
										<ShowResolvedDebtsOption />
									) : null}
									<Button color="secondary" onPress={setAllMax}>
										All max
									</Button>
								</View>
								{allCurrenciesWithSums.map(({ currencyCode, sum }) => (
									<form.AppField key={currencyCode} name={currencyCode}>
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
														step={10 ** -debtAmountSchemaDecimal}
														formatOptions={{
															signDisplay: "exceptZero",
															maximumFractionDigits: debtAmountSchemaDecimal,
														}}
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
																	<Text>MAX</Text>
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
							Add a currency
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
								{mutationError ? mutationError.message : "Transfer debt(s)"}
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
	query: TRPCQuerySuccessResult<"debts.getIdsByUser">;
} & Pick<FormProps, "fromUser" | "toUser">;

const DebtsList: React.FC<DebtsProps> = ({ query, fromUser, toUser }) => {
	const [showResolvedDebts] = useShowResolvedDebts();
	const [
		aggregatedDebts,
		nonZeroAggregatedDebts,
		aggregatedDebtsLoading,
		aggregatedDebtsErrorQueries,
	] = useAggregatedDebts(query);
	if (aggregatedDebtsLoading) {
		return (
			<View>
				<Spinner size="lg" />
			</View>
		);
	}
	if (aggregatedDebtsErrorQueries.length !== 0) {
		return values(
			groupBy(
				aggregatedDebtsErrorQueries,
				(errorQuery) => errorQuery.error.message,
			),
		).map((queries) => (
			<GroupedQueryErrorMessage
				key={queries[0].error.message}
				queries={queries}
			/>
		));
	}
	const debtRows = showResolvedDebts ? aggregatedDebts : nonZeroAggregatedDebts;
	return (
		<DebtsListForm
			aggregatedDebts={debtRows}
			shouldShowResolvedDebtsButton={
				aggregatedDebts.length !== nonZeroAggregatedDebts.length
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
	const fromUserQuery = trpc.users.get.useQuery(
		fromId ? { id: fromId } : skipToken,
	);
	const onFromClick = React.useCallback(
		(userId: UsersId) => {
			void setFromId(fromId === userId ? null : userId);
		},
		[fromId, setFromId],
	);
	const onToClick = React.useCallback(
		(userId: UsersId) => {
			void setToId(toId === userId ? null : userId);
		},
		[setToId, toId],
	);
	const toUserQuery = trpc.users.get.useQuery(toId ? { id: toId } : skipToken);
	const fromUserDebts = trpc.debts.getIdsByUser.useQuery(
		fromId ? { userId: fromId } : skipToken,
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
				Transfer debts
			</PageHeader>
			<View className="flex-row gap-2 self-center">
				<UsersSuggest
					label="From"
					selected={fromId}
					onUserClick={onFromClick}
					closeOnSelect
					setUserNameToInput
					selectedProps={{ className: "flex flex-row gap-2 items-center" }}
				/>
				<BackArrow className="size-10 rotate-180" />
				<UsersSuggest
					label="To"
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
