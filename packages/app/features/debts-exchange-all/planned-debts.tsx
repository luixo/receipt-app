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
import {
	MAX_BATCH_DEBTS,
	MIN_BATCH_DEBTS,
	currencyRateSchema,
} from "app/utils/validation";
import type { UsersId } from "next-app/db/models";
import { currencyCodeSchema } from "next-app/handlers/validation";

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
	const addBatchMutation = trpc.debts.addBatch.useMutation(
		useTrpcMutationOptions(mutations.debts.addBatch.options, {
			onSuccess: () => onDone(),
		}),
	);
	const addBatch = React.useCallback(
		() =>
			addBatchMutation.mutate(
				debts.map((debt, index) => ({
					note: debt.note,
					currencyCode: debt.currencyCode,
					userId,
					amount: debt.amount,
					timestamp: new Date(Date.now() + index),
				})),
			),
		[addBatchMutation, debts, userId],
	);
	const invalidConvertedDebts = convertedDebts.filter(
		(debt) =>
			debt.sum === 0 || Number.isNaN(debt.sum) || !Number.isFinite(debt.sum),
	);

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
				onClick={addBatch}
				isDisabled={
					addBatchMutation.isPending ||
					ratesQuery.isLoading ||
					debts.length > MAX_BATCH_DEBTS ||
					debts.length < MIN_BATCH_DEBTS ||
					invalidConvertedDebts.length !== 0
				}
				isLoading={addBatchMutation.isPending || ratesQuery.isLoading}
				color={addBatchMutation.status === "error" ? "danger" : "primary"}
			>
				{addBatchMutation.error
					? addBatchMutation.error.message
					: invalidConvertedDebts.length !== 0
					? `${invalidConvertedDebts
							.map((debt) => debt.currencyCode)
							.join(", ")} debt(s) are invalid`
					: debts.length > MAX_BATCH_DEBTS
					? `Cannot send more than ${MAX_BATCH_DEBTS} simultaneously`
					: debts.length < MIN_BATCH_DEBTS
					? `Cannot send less than ${MIN_BATCH_DEBTS} simultaneously`
					: "Send debts"}
			</Button>
		</>
	);
};
