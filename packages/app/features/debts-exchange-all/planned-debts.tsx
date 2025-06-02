import React from "react";
import { View } from "react-native";

import { useStore } from "@tanstack/react-form";
import { entries, isNonNullish, unique } from "remeda";
import { z } from "zod";

import { ErrorMessage } from "~app/components/error-message";
import { useLocale } from "~app/hooks/use-locale";
import { useTrpcMutationOptions } from "~app/hooks/use-trpc-mutation-options";
import { useTrpcMutationStates } from "~app/hooks/use-trpc-mutation-state";
import { trpc } from "~app/trpc";
import { type CurrencyCode, formatCurrency } from "~app/utils/currency";
import { useAppForm } from "~app/utils/forms";
import type { Locale } from "~app/utils/locale";
import {
	currencyCodeSchema,
	currencyRateSchema,
	currencyRateSchemaDecimal,
} from "~app/utils/validation";
import { Button } from "~components/button";
import { Spinner } from "~components/spinner";
import { Text } from "~components/text";
import type { UsersId } from "~db/models";
import { options as debtsAddOptions } from "~mutations/debts/add";
import { round } from "~utils/math";

const formSchema = z.record(
	currencyCodeSchema,
	z
		.record(currencyCodeSchema, currencyRateSchema)
		.superRefine((record, ctx) => {
			const invalidAmounts = entries(record).filter(
				([, sum]) => Number.isNaN(sum) || !Number.isFinite(sum) || sum === 0,
			);
			if (invalidAmounts.length !== 0) {
				ctx.addIssue({
					code: z.ZodIssueCode.custom,
					message: `${invalidAmounts
						.map(([currencyCode]) => currencyCode)
						.join(", ")} debt(s) are invalid`,
				});
			}
		}),
);
type Form = z.infer<typeof formSchema>;

const getDebt = (
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
			note: `Converted from ${sourceDebts
				.map(({ currencyCode: sourceCurrencyCode, sum }) =>
					formatCurrency(locale, sourceCurrencyCode, sum),
				)
				.join(", ")}`,
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
		note: `Converted to${
			amount ? ` ${formatCurrency(locale, selectedCurrencyCode, amount)}` : ""
		}`,
	};
};

type Props = {
	aggregatedDebts: { currencyCode: CurrencyCode; sum: number }[];
	selectedCurrencyCode: CurrencyCode;
	userId: UsersId;
	onDone: () => void;
};

export const PlannedDebts: React.FC<Props> = ({
	aggregatedDebts,
	selectedCurrencyCode,
	userId,
	onDone,
}) => {
	const allCurrencyCodes = unique([
		...aggregatedDebts.map((debt) => debt.currencyCode),
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
	const defaultValues: Partial<Form> = {
		[selectedCurrencyCode]: aggregatedDebts.reduce(
			(acc, debt) =>
				debt.currencyCode === selectedCurrencyCode
					? acc
					: {
							...acc,
							[debt.currencyCode]: 0,
					  },
			{},
		),
	};
	const addMutation = trpc.debts.add.useMutation(
		useTrpcMutationOptions(debtsAddOptions),
	);
	const [lastMutationTimestamps, setLastMutationTimestamps] = React.useState<
		number[]
	>([]);
	const form = useAppForm({
		defaultValues: defaultValues as Form,
		validators: {
			onMount: formSchema,
			onChange: formSchema,
			onSubmit: formSchema,
		},
		onSubmit: ({ value }) => {
			setLastMutationTimestamps(
				allCurrencyCodes.reduce<number[]>((acc, currencyCode, index) => {
					const debt = getDebt(
						currencyCode,
						selectedCurrencyCode,
						aggregatedDebts,
						value[selectedCurrencyCode] ?? {},
						locale,
					);
					const timestamp = new Date(Date.now() + index);
					addMutation.mutate({
						note: debt.note,
						currencyCode,
						userId,
						amount: debt.amount,
						timestamp,
					});
					return [...acc, timestamp.valueOf()];
				}, []),
			);
		},
	});
	const lastMutationStates = useTrpcMutationStates<"debts.add">(
		trpc.debts.add,
		(vars) => lastMutationTimestamps.includes(vars.timestamp?.valueOf() ?? 0),
	);
	const selectedRates = useStore(
		form.store,
		(store) => store.values[selectedCurrencyCode],
	);
	const fieldMeta = useStore(form.store, (store) => store.fieldMeta);
	const ratesQuery = trpc.currency.rates.useQuery({
		from: selectedCurrencyCode,
		to: aggregatedDebts
			.map((debt) => debt.currencyCode)
			.filter((code) => code !== selectedCurrencyCode),
	});
	React.useEffect(() => {
		if (ratesQuery.status !== "success") {
			return;
		}
		entries(ratesQuery.data).forEach(([key, value]) => {
			if (!selectedRates?.[key]) {
				if (!fieldMeta[`${selectedCurrencyCode}.${key}`]?.isBlurred) {
					form.setFieldValue(`${selectedCurrencyCode}.${key}`, value);
				}
			}
		});
	}, [
		ratesQuery.status,
		ratesQuery.data,
		selectedRates,
		form,
		fieldMeta,
		selectedCurrencyCode,
	]);
	const retryButton = React.useMemo(
		() => ({ text: "Refetch rates", onPress: () => ratesQuery.refetch() }),
		[ratesQuery],
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
				{ratesQuery.error ? (
					<ErrorMessage
						message={ratesQuery.error.message}
						button={retryButton}
					/>
				) : null}
				{allCurrencyCodes.map((currencyCode) => {
					const selected = selectedCurrencyCode === currencyCode;
					const debt = getDebt(
						currencyCode,
						selectedCurrencyCode,
						aggregatedDebts,
						selectedRates,
						locale,
					);
					const note = (
						<>{ratesQuery.isLoading && !selected ? <Spinner /> : debt.note}</>
					);
					return (
						<View className="gap-1" key={currencyCode}>
							<View className="flex-row gap-4">
								<Text
									className={`flex-1 self-center ${
										debt.amount >= 0 ? "text-success" : "text-danger"
									}`}
								>
									{selected && ratesQuery.isLoading ? (
										<Spinner />
									) : (
										formatCurrency(locale, currencyCode, round(debt.amount))
									)}
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
													step={10 ** -currencyRateSchemaDecimal}
													formatOptions={{
														maximumFractionDigits: currencyRateSchemaDecimal,
													}}
													aria-label={currencyCode}
													isRequired
												/>
											)}
										</form.AppField>
									)}
								</View>
								<View className="flex-1 justify-center max-md:hidden">
									{note}
								</View>
							</View>
							<View className="md:hidden">{note}</View>
						</View>
					);
				})}
				<form.Subscribe selector={(state) => state.canSubmit}>
					{(canSubmit) => (
						<Button
							isDisabled={!canSubmit || mutationPending || ratesQuery.isLoading}
							isLoading={mutationPending || ratesQuery.isLoading}
							color={mutationError ? "danger" : "primary"}
							type="submit"
						>
							{mutationError ? mutationError.message : "Send debts"}
						</Button>
					)}
				</form.Subscribe>
			</form.Form>
		</form.AppForm>
	);
};
