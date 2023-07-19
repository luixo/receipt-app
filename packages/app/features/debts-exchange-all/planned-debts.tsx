import React from "react";

import { zodResolver } from "@hookform/resolvers/zod";
import { Spacer, Card, Button, Loading } from "@nextui-org/react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { ErrorMessage } from "app/components/error-message";
import { useFormattedCurrencies } from "app/hooks/use-formatted-currencies";
import { useFormattedCurrency } from "app/hooks/use-formatted-currency";
import { useMountEffect } from "app/hooks/use-mount-effect";
import { useTrpcMutationOptions } from "app/hooks/use-trpc-mutation-options";
import { mutations } from "app/mutations";
import {
	MAX_BATCH_DEBTS,
	MIN_BATCH_DEBTS,
} from "app/mutations/debts/add-batch";
import { trpc } from "app/trpc";
import { CurrencyCode } from "app/utils/currency";
import { round } from "app/utils/math";
import { currencyRateSchema } from "app/utils/validation";
import { UsersId } from "next-app/db/models";
import { currencyCodeSchema } from "next-app/handlers/validation";

import { PlannedDebt } from "./planned-debt";

const getDefaultValues = (
	selectedCurrencyCode: CurrencyCode,
	debts: { currencyCode: CurrencyCode }[],
	currentRates: Partial<Record<CurrencyCode, number>> = {}
) => ({
	...debts.reduce(
		(acc, debt) =>
			debt.currencyCode === selectedCurrencyCode
				? acc
				: {
						...acc,
						[debt.currencyCode]: 0,
				  },
		{}
	),
	...Object.fromEntries(
		Object.entries(currentRates).filter(([, value]) => value !== undefined)
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
				z.record(currencyCodeSchema, z.preprocess(Number, currencyRateSchema))
			)
		),
		defaultValues: {
			[selectedCurrencyCode]: getDefaultValues(
				selectedCurrencyCode,
				aggregatedDebts
			),
		},
	});
	React.useEffect(() => {
		const currentRates = form.getValues()[selectedCurrencyCode];
		form.setValue(
			selectedCurrencyCode as `${CurrencyCode}`,
			getDefaultValues(selectedCurrencyCode, aggregatedDebts, currentRates)
		);
	}, [selectedCurrencyCode, aggregatedDebts, form]);
	const rates = form.watch();
	const convertedFromDebts = React.useMemo(
		() =>
			aggregatedDebts.filter(
				(debt) => debt.currencyCode !== selectedCurrencyCode
			),
		[aggregatedDebts, selectedCurrencyCode]
	);
	const currencies = useFormattedCurrencies(
		convertedFromDebts.map((debt) => debt.currencyCode)
	);
	const selectedCurrency = useFormattedCurrency(selectedCurrencyCode);
	const convertedDebts = React.useMemo(() => {
		const selectedRates = rates[selectedCurrencyCode];
		if (!selectedRates) {
			return convertedFromDebts.map((debt) => ({
				sum: 0,
				currencyCode: debt.currencyCode,
			}));
		}
		return convertedFromDebts.map((debt) => {
			const selectedRate = selectedRates[debt.currencyCode];
			return {
				sum: selectedRate ? round(debt.sum / selectedRate) : 0,
				currencyCode: debt.currencyCode,
			};
		});
	}, [convertedFromDebts, selectedCurrencyCode, rates]);
	const debts = React.useMemo(() => {
		const debtsToConvert = convertedFromDebts.map((debt, index) => ({
			amount: -debt.sum,
			currencyCode: debt.currencyCode,
			note: `Converted to ${convertedDebts[index]!.sum} ${selectedCurrency}`,
		}));
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
						value
					);
				}
			});
		},
		[form, selectedCurrencyCode]
	);
	const ratesQuery = trpc.currency.rates.useQuery(
		{
			from: selectedCurrencyCode,
			to: debts.map((debt) => debt.currencyCode),
		},
		{ onSuccess: fillRatesData }
	);
	const retryButton = React.useMemo(
		() => ({ text: "Refetch rates", onClick: () => ratesQuery.refetch() }),
		[ratesQuery]
	);
	useMountEffect(() => {
		if (ratesQuery.status === "success") {
			fillRatesData(ratesQuery.data);
		}
	});
	const addBatchMutation = trpc.debts.addBatch.useMutation(
		useTrpcMutationOptions(mutations.debts.addBatch.options, {
			onSuccess: () => onDone(),
		})
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
				}))
			),
		[addBatchMutation, debts, userId]
	);
	const emptyConvertedDebts = convertedDebts.filter((debt) => debt.sum === 0);

	return (
		<>
			<Card.Divider />
			{ratesQuery.error ? (
				<>
					<Spacer y={1} />
					<ErrorMessage
						message={ratesQuery.error.message}
						button={retryButton}
					/>
				</>
			) : null}
			<Spacer y={1} />
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
			<Spacer y={1} />
			<Button
				onClick={addBatch}
				disabled={
					addBatchMutation.isLoading ||
					ratesQuery.isLoading ||
					debts.length > MAX_BATCH_DEBTS ||
					debts.length < MIN_BATCH_DEBTS ||
					emptyConvertedDebts.length !== 0
				}
				color={addBatchMutation.status === "error" ? "error" : undefined}
			>
				{addBatchMutation.isLoading || ratesQuery.isLoading ? (
					<Loading color="currentColor" size="sm" />
				) : addBatchMutation.error ? (
					addBatchMutation.error.message
				) : emptyConvertedDebts.length !== 0 ? (
					`${emptyConvertedDebts.map(
						(debt) => debt.currencyCode
					)} debt(s) are empty`
				) : debts.length > MAX_BATCH_DEBTS ? (
					`Cannot send more than ${MAX_BATCH_DEBTS} simultaneously`
				) : debts.length < MIN_BATCH_DEBTS ? (
					`Cannot send less than ${MIN_BATCH_DEBTS} simultaneously`
				) : (
					"Send debts"
				)}
			</Button>
		</>
	);
};
