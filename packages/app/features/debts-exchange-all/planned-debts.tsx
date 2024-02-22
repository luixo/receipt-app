import React from "react";

import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@nextui-org/react";
import { useForm, useWatch } from "react-hook-form";
import { z } from "zod";

import { ErrorMessage } from "app/components/error-message";
import { useFormattedCurrencies } from "app/hooks/use-formatted-currencies";
import { useFormattedCurrency } from "app/hooks/use-formatted-currency";
import { useTrpcMutationOptions } from "app/hooks/use-trpc-mutation-options";
import { mutations } from "app/mutations";
import { trpc } from "app/trpc";
import type { CurrencyCode } from "app/utils/currency";
import { round } from "app/utils/math";
import { nonNullishGuard } from "app/utils/utils";
import { currencyCodeSchema, currencyRateSchema } from "app/utils/validation";
import type { UsersId } from "next-app/db/models";

import { PlannedDebt } from "./planned-debt";

const getDefaultValues = (
	selectedCurrencyCode: CurrencyCode,
	debts: { currencyCode: CurrencyCode }[],
	currentRates: Partial<Record<CurrencyCode, number>> = {},
) => ({
	...debts.reduce(
		(acc, debt) =>
			debt.currencyCode === selectedCurrencyCode
				? acc
				: {
						...acc,
						[debt.currencyCode]: 0,
				  },
		{},
	),
	...Object.fromEntries(
		Object.entries(currentRates).filter(([, value]) => value !== undefined),
	),
});

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
	const form = useForm<Record<CurrencyCode, Record<CurrencyCode, number>>>({
		mode: "onChange",
		resolver: zodResolver(
			z.record(
				currencyCodeSchema,
				z.record(currencyCodeSchema, z.preprocess(Number, currencyRateSchema)),
			),
		),
		defaultValues: {
			[selectedCurrencyCode]: getDefaultValues(
				selectedCurrencyCode,
				aggregatedDebts,
			),
		},
	});
	const convertedFromDebts = React.useMemo(
		() =>
			aggregatedDebts.filter(
				(debt) => debt.currencyCode !== selectedCurrencyCode,
			),
		[aggregatedDebts, selectedCurrencyCode],
	);
	const currencies = useFormattedCurrencies(
		convertedFromDebts.map((debt) => debt.currencyCode),
	);
	const selectedCurrency = useFormattedCurrency(selectedCurrencyCode);
	const selectedRates = useWatch({
		control: form.control,
		name: selectedCurrencyCode as `${string & CurrencyCode}`,
	});
	const convertedDebts = React.useMemo(() => {
		if (!selectedRates) {
			return convertedFromDebts.map((debt) => ({
				sum: 0,
				currencyCode: debt.currencyCode,
			}));
		}
		return convertedFromDebts.map((debt) => {
			const selectedRate = selectedRates[debt.currencyCode]!;
			return {
				sum: selectedRate ? round(debt.sum / selectedRate) : 0,
				currencyCode: debt.currencyCode,
			};
		});
	}, [convertedFromDebts, selectedRates]);
	const debts = React.useMemo(() => {
		const debtsToConvert = convertedFromDebts.map((debt, index) => {
			const convertedSumRaw = convertedDebts[index]!.sum;
			const convertedSum = convertedSumRaw === Infinity ? "∞" : convertedSumRaw;
			return {
				amount: -debt.sum,
				currencyCode: debt.currencyCode,
				note: `Converted to ${convertedSum} ${selectedCurrency}`,
			};
		});
		return [
			...debtsToConvert,
			{
				amount: convertedDebts.reduce((acc, debt) => acc + debt.sum, 0),
				currencyCode: selectedCurrencyCode,
				note: `Converted from ${debtsToConvert
					.map(({ amount }, index) => `${amount} ${currencies[index]}`)
					.join(", ")}`,
			},
		];
	}, [
		selectedCurrencyCode,
		convertedFromDebts,
		currencies,
		selectedCurrency,
		convertedDebts,
	]);
	const fillRatesData = React.useCallback(
		(data: Record<CurrencyCode, number>) => {
			const currentRates = form.getValues()[selectedCurrencyCode];
			Object.entries(data).forEach(([key, value]) => {
				if (!currentRates || !currentRates[key]) {
					form.setValue(
						`${selectedCurrencyCode}.${key}` as `${CurrencyCode}.${CurrencyCode}`,
						value,
					);
				}
			});
		},
		[form, selectedCurrencyCode],
	);
	const ratesQuery = trpc.currency.rates.useQuery({
		from: selectedCurrencyCode,
		to: debts
			.map((debt) => debt.currencyCode)
			.filter((code) => code !== selectedCurrencyCode),
	});
	React.useEffect(() => {
		if (ratesQuery.status !== "success") {
			return;
		}
		fillRatesData(ratesQuery.data);
	}, [ratesQuery.status, ratesQuery.data, fillRatesData]);
	const retryButton = React.useMemo(
		() => ({ text: "Refetch rates", onClick: () => ratesQuery.refetch() }),
		[ratesQuery],
	);
	const addMutations = debts.map(() =>
		trpc.debts.add.useMutation(
			// eslint-disable-next-line react-hooks/rules-of-hooks
			useTrpcMutationOptions(mutations.debts.add.options),
		),
	);
	const isEveryMutationSuccessful = addMutations.every(
		(mutation) => mutation.status === "success",
	);
	React.useEffect(() => {
		if (isEveryMutationSuccessful) {
			onDone();
		}
	}, [isEveryMutationSuccessful, onDone]);
	const addAll = React.useCallback(
		() =>
			debts.map((debt, index) =>
				addMutations[index]!.mutate({
					note: debt.note,
					currencyCode: debt.currencyCode,
					userId,
					amount: debt.amount,
					timestamp: new Date(Date.now() + index),
				}),
			),
		[addMutations, debts, userId],
	);
	const invalidConvertedDebts = convertedDebts.filter(
		(debt) =>
			debt.sum === 0 || Number.isNaN(debt.sum) || !Number.isFinite(debt.sum),
	);
	const mutationPending = addMutations.some((mutation) => mutation.isPending);
	const mutationError = addMutations
		.map((mutation) => mutation.error)
		.find(nonNullishGuard);

	return (
		<>
			{ratesQuery.error ? (
				<ErrorMessage message={ratesQuery.error.message} button={retryButton} />
			) : null}
			{debts.map((debt) => (
				<PlannedDebt
					key={debt.currencyCode}
					selectedCurrencyCode={selectedCurrencyCode}
					form={form}
					ratesLoading={ratesQuery.isLoading}
					currencyCode={debt.currencyCode}
					amount={debt.amount}
					note={debt.note}
				/>
			))}
			<Button
				onClick={addAll}
				isDisabled={
					mutationPending ||
					ratesQuery.isLoading ||
					invalidConvertedDebts.length !== 0
				}
				isLoading={mutationPending || ratesQuery.isLoading}
				color={mutationError ? "danger" : "primary"}
			>
				{mutationError
					? mutationError.message
					: invalidConvertedDebts.length !== 0
					? `${invalidConvertedDebts
							.map((debt) => debt.currencyCode)
							.join(", ")} debt(s) are invalid`
					: "Send debts"}
			</Button>
		</>
	);
};
