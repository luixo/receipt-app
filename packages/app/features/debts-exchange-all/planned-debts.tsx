import React from "react";
import { View } from "react-native";

import { useStore } from "@tanstack/react-form";
import { hashKey, useMutation, useSuspenseQuery } from "@tanstack/react-query";
import type { TFunction } from "i18next";
import { useTranslation } from "react-i18next";
import { entries, isNonNullish, unique } from "remeda";
import { z } from "zod";

import { suspendedFallback } from "~app/components/suspense-wrapper";
import { useLocale } from "~app/hooks/use-locale";
import { useTrpcMutationOptions } from "~app/hooks/use-trpc-mutation-options";
import { useTrpcMutationStates } from "~app/hooks/use-trpc-mutation-state";
import {
	type CurrencyCode,
	formatCurrency,
	getCurrencySymbol,
} from "~app/utils/currency";
import { useAppForm } from "~app/utils/forms";
import type { Locale } from "~app/utils/locale";
import { useTRPC } from "~app/utils/trpc";
import {
	currencyCodeSchema,
	currencyRateSchema,
	currencyRateSchemaDecimal,
} from "~app/utils/validation";
import { Button } from "~components/button";
import { SkeletonNumberInput } from "~components/number-input";
import { Skeleton } from "~components/skeleton";
import { Text } from "~components/text";
import type { UserId } from "~db/ids";
import { options as debtsAddOptions } from "~mutations/debts/add";
import { getNow } from "~utils/date";
import { round } from "~utils/math";

const createFormSchema = (t: TFunction<"debts">) =>
	z.record(
		currencyCodeSchema,
		z.record(currencyCodeSchema, currencyRateSchema).check((ctx) => {
			const invalidAmounts = entries(ctx.value).filter(
				([, sum]) => Number.isNaN(sum) || !Number.isFinite(sum) || sum === 0,
			);
			if (invalidAmounts.length !== 0) {
				ctx.issues.push({
					code: "custom",
					input: invalidAmounts,
					message: t("exchange.validation.invalidAmounts", {
						amount: invalidAmounts
							.map(([currencyCode]) => currencyCode)
							.join(", "),
					}),
				});
			}
		}),
	);
type Form = z.infer<ReturnType<typeof createFormSchema>>;

const getDebt = (
	t: TFunction<"debts">,
	currencyCode: CurrencyCode,
	selectedCurrencyCode: CurrencyCode,
	aggregatedDebts: { currencyCode: CurrencyCode; sum: number }[],
	selectedRates: Record<CurrencyCode, number> | undefined,
	locale: Locale,
) => {
	const sourceDebts = aggregatedDebts.filter(
		(debt) => debt.currencyCode !== selectedCurrencyCode,
	);
	if (currencyCode === selectedCurrencyCode) {
		return {
			amount: -round(
				sourceDebts.reduce((acc, debt) => {
					const selectedRate = selectedRates?.[debt.currencyCode] ?? 0;
					const amount = selectedRate ? -round(debt.sum / selectedRate) : 0;
					return acc + amount;
				}, 0),
			),
			currencyCode,
			note: t("exchange.defaultNoteFrom", {
				debts: sourceDebts
					.map(({ currencyCode: sourceCurrencyCode, sum }) =>
						formatCurrency(locale, sourceCurrencyCode, sum),
					)
					.join(", "),
			}),
		};
	}
	const matchedDebt = aggregatedDebts.find(
		(debt) => debt.currencyCode === currencyCode,
	);
	if (!matchedDebt) {
		throw new Error(
			`Expected to match every currency debt, ${currencyCode} is missing`,
		);
	}
	const selectedRate = selectedRates?.[currencyCode] ?? 0;
	const amount = selectedRate ? -round(matchedDebt.sum / selectedRate) : 0;
	return {
		amount: -matchedDebt.sum,
		currencyCode,
		note: t("exchange.defaultNoteTo", {
			debt: amount
				? formatCurrency(locale, selectedCurrencyCode, amount)
				: getCurrencySymbol(locale, selectedCurrencyCode),
		}),
	};
};

type Props = {
	selectedCurrencyCode: CurrencyCode;
	userId: UserId;
	onDone: () => void;
};

export const PlannedDebts: React.FC<Props> = suspendedFallback(
	({ selectedCurrencyCode, userId, onDone }) => {
		const { t } = useTranslation("debts");
		const trpc = useTRPC();
		const { data: debts } = useSuspenseQuery(
			trpc.debts.getAllUser.queryOptions({ userId }),
		);
		const nonResolvedDebts = debts.filter((element) => element.sum !== 0);
		const allCurrencyCodes = unique([
			...nonResolvedDebts.map((debt) => debt.currencyCode),
			selectedCurrencyCode,
		]).sort((currencyCodeA, currencyCodeB) => {
			if (currencyCodeA === selectedCurrencyCode) {
				return 1;
			}
			if (currencyCodeB === selectedCurrencyCode) {
				return -1;
			}
			return 0;
		});
		const locale = useLocale();
		const { data: rates } = useSuspenseQuery(
			trpc.currency.rates.queryOptions({
				from: selectedCurrencyCode,
				to: nonResolvedDebts
					.map((debt) => debt.currencyCode)
					.filter((code) => code !== selectedCurrencyCode),
			}),
		);
		const defaultValues: Partial<Form> = {
			[selectedCurrencyCode]: nonResolvedDebts.reduce(
				(acc, debt) =>
					debt.currencyCode === selectedCurrencyCode
						? acc
						: {
								...acc,
								[debt.currencyCode]: rates[debt.currencyCode],
							},
				{},
			),
		};
		const addMutation = useMutation(
			trpc.debts.add.mutationOptions(useTrpcMutationOptions(debtsAddOptions)),
		);
		const [lastMutationTimestamps, setLastMutationTimestamps] = React.useState<
			string[]
		>([]);
		const formSchema = React.useMemo(() => createFormSchema(t), [t]);
		const form = useAppForm({
			defaultValues: defaultValues as Form,
			validators: {
				onMount: formSchema,
				onChange: formSchema,
				onSubmit: formSchema,
			},
			onSubmit: ({ value }) => {
				setLastMutationTimestamps(
					allCurrencyCodes.reduce<string[]>((acc, currencyCode) => {
						const debt = getDebt(
							t,
							currencyCode,
							selectedCurrencyCode,
							nonResolvedDebts,
							value[selectedCurrencyCode] ?? {},
							locale,
						);
						const mutationVars = {
							note: debt.note,
							currencyCode,
							userId,
							amount: debt.amount,
							timestamp: getNow.plainDate(),
						};
						addMutation.mutate(mutationVars);
						return [...acc, hashKey([mutationVars])];
					}, []),
				);
			},
		});
		const lastMutationStates = useTrpcMutationStates<"debts.add">(
			trpc.debts.add.mutationKey(),
			(vars) => lastMutationTimestamps.includes(hashKey([vars])),
		);
		const selectedRates = useStore(
			form.store,
			(store) => store.values[selectedCurrencyCode],
		);
		const isEveryMutationSuccessful =
			lastMutationStates.length !== 0 &&
			lastMutationStates.every((mutation) => mutation.status === "success");
		React.useEffect(() => {
			if (isEveryMutationSuccessful) {
				onDone();
			}
		}, [isEveryMutationSuccessful, onDone]);
		const mutationPending = lastMutationStates.some(
			(mutation) => mutation.status === "pending",
		);
		const mutationError = lastMutationStates
			.map((mutation) => mutation.error)
			.find(isNonNullish);

		return (
			<form.AppForm>
				<form.Form className="flex flex-col gap-4">
					{allCurrencyCodes.map((currencyCode) => {
						const selected = selectedCurrencyCode === currencyCode;
						const debt = getDebt(
							t,
							currencyCode,
							selectedCurrencyCode,
							nonResolvedDebts,
							selectedRates,
							locale,
						);
						return (
							<View className="gap-1" key={currencyCode}>
								<View className="flex-row gap-4">
									<Text
										className={`flex-1 self-center ${
											debt.amount >= 0 ? "text-success" : "text-danger"
										}`}
									>
										{formatCurrency(locale, currencyCode, round(debt.amount))}
									</Text>
									<View className="flex-1">
										{selected ? null : (
											<form.AppField
												// Reload input on selected currency code change, otherwise
												// the hook will run `register` method which will propagate current value
												key={selectedCurrencyCode}
												name={`${selectedCurrencyCode}.${currencyCode}`}
											>
												{(field) => (
													<field.NumberField
														value={field.state.value}
														onValueChange={field.setValue}
														name={field.name}
														onBlur={field.handleBlur}
														fieldError={
															field.state.meta.isDirty
																? field.state.meta.errors
																: undefined
														}
														min="0"
														fractionDigits={currencyRateSchemaDecimal}
														aria-label={currencyCode}
														isRequired
													/>
												)}
											</form.AppField>
										)}
									</View>
									<View className="flex-1 justify-center max-md:hidden">
										<Text>{debt.note}</Text>
									</View>
								</View>
								<View className="md:hidden">
									<Text>{debt.note}</Text>
								</View>
							</View>
						);
					})}
					<form.Subscribe selector={(state) => state.canSubmit}>
						{(canSubmit) => (
							<Button
								isDisabled={!canSubmit || mutationPending}
								isLoading={mutationPending}
								color={mutationError ? "danger" : "primary"}
								type="submit"
							>
								{mutationError
									? mutationError.message
									: t("exchange.sendButton")}
							</Button>
						)}
					</form.Subscribe>
				</form.Form>
			</form.AppForm>
		);
	},
	() => {
		const { t } = useTranslation("debts");
		return (
			<View className="flex flex-col gap-4">
				{Array.from({ length: 3 }).map((_, index) => (
					// eslint-disable-next-line react/no-array-index-key
					<View className="gap-1" key={index}>
						<View className="flex-row gap-4">
							<View className="flex-1 self-center">
								<Skeleton className="h-6 w-20 rounded-md" />
							</View>
							<View className="flex-1">
								<SkeletonNumberInput />
							</View>
							<View className="flex-1 justify-center max-md:hidden">
								<Skeleton className="h-6 w-48 rounded-md" />
							</View>
						</View>
						<View className="md:hidden">
							<Skeleton className="h-6 w-48 rounded-md" />
						</View>
					</View>
				))}
				<Button isDisabled color="primary">
					{t("exchange.sendButton")}
				</Button>
			</View>
		);
	},
);
