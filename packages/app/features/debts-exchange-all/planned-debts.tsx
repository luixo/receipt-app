import React from "react";
import { View } from "react-native";

import { zodResolver } from "@hookform/resolvers/zod";
import type { UseFormReturn } from "react-hook-form";
import { useForm, useWatch } from "react-hook-form";
import { entries, isNonNullish, omitBy } from "remeda";
import { z } from "zod";

import { ErrorMessage } from "~app/components/error-message";
import { useFormattedCurrencies } from "~app/hooks/use-formatted-currencies";
import { useFormattedCurrency } from "~app/hooks/use-formatted-currency";
import { useInputController } from "~app/hooks/use-input-controller";
import { useTrpcMutationOptions } from "~app/hooks/use-trpc-mutation-options";
import { trpc } from "~app/trpc";
import type { CurrencyCode } from "~app/utils/currency";
import { currencyCodeSchema, currencyRateSchema } from "~app/utils/validation";
import { Button } from "~components/button";
import { Input } from "~components/input";
import { Spinner } from "~components/spinner";
import { Text } from "~components/text";
import type { UsersId } from "~db/models";
import { options as debtsAddOptions } from "~mutations/debts/add";
import { round } from "~utils/math";

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
	...omitBy(currentRates, (value) => value === undefined),
});

type InputProps = {
	currencyCode: CurrencyCode;
} & Pick<DebtProps, "selectedCurrencyCode" | "form">;

const RateInput: React.FC<InputProps> = ({
	selectedCurrencyCode,
	currencyCode,
	form,
}) => {
	const { bindings, state: inputState } = useInputController({
		form,
		name: `${selectedCurrencyCode}.${currencyCode}`,
		type: "number",
		// see https://github.com/react-hook-form/react-hook-form/issues/12259
		defaultValue: 0 as unknown as undefined,
	});
	return (
		<Input
			key={`${selectedCurrencyCode}.${currencyCode}`}
			{...bindings}
			aria-label={currencyCode}
			required
			type="number"
			min="0"
			fieldError={inputState.error}
		/>
	);
};

type DebtProps = {
	selectedCurrencyCode: CurrencyCode;
	form: UseFormReturn<
		Partial<Record<CurrencyCode, Record<CurrencyCode, number>>>
	>;
	ratesLoading: boolean;
	currencyCode: CurrencyCode;
	amount: number;
	note: string;
};

const PlannedDebt: React.FC<DebtProps> = ({
	selectedCurrencyCode,
	form,
	ratesLoading,
	amount,
	currencyCode,
	note,
}) => {
	const selected = selectedCurrencyCode === currencyCode;
	const rate = <>{ratesLoading && !selected ? <Spinner /> : note}</>;
	return (
		<View className="gap-1">
			<View className="flex-row gap-4">
				<Text
					className={`flex-1 self-center ${
						amount >= 0 ? "text-success" : "text-danger"
					}`}
				>
					{selected && ratesLoading ? (
						<Spinner />
					) : (
						`${round(amount)} ${currencyCode}`
					)}
				</Text>
				<View className="flex-1">
					{selected ? null : (
						<RateInput
							// Reload input on selected currency code change will rerun useInputController
							// Otherwise the hook will run `register` method which will propagate current value
							// to the new form key
							key={selectedCurrencyCode}
							form={form}
							selectedCurrencyCode={selectedCurrencyCode}
							currencyCode={currencyCode}
						/>
					)}
				</View>
				<View className="flex-1 max-md:hidden">{rate}</View>
			</View>
			<View className="md:hidden">{rate}</View>
		</View>
	);
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
	const form = useForm<
		Partial<Record<CurrencyCode, Record<CurrencyCode, number>>>
	>({
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
	// Extending the type because `selectedCurrencyCode`
	const selectedRates: Record<CurrencyCode, number> | undefined = useWatch({
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
			const selectedRate = selectedRates[debt.currencyCode];
			return {
				sum: selectedRate ? round(debt.sum / selectedRate) : 0,
				currencyCode: debt.currencyCode,
			};
		});
	}, [convertedFromDebts, selectedRates]);
	const debts = React.useMemo(() => {
		const debtsToConvert = convertedFromDebts.map((debt, index) => {
			// `convertedFromDebts` is mapped from `convertedDebts`
			// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
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
			entries(data).forEach(([key, value]) => {
				if (!currentRates?.[key]) {
					// see https://github.com/react-hook-form/react-hook-form/issues/12259
					form.setValue(`${selectedCurrencyCode}.${key}`, value as never, {
						shouldValidate: true,
					});
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
			useTrpcMutationOptions(debtsAddOptions),
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
				// `debts` is mapped from `addMutations`
				// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
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
		.find(isNonNullish);

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
