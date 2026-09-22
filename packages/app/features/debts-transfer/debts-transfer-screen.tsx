import React from "react";

import {
	hashKey,
	skipToken,
	useMutation,
	usePrefetchQuery,
	useQueryClient,
	useSuspenseQuery,
} from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { entries, isNonNullish, pullObject } from "remeda";
import { z } from "zod";

import { CurrenciesPicker } from "~app/components/app/currencies-picker";
import { PeersSuggest } from "~app/components/app/peers-suggest";
import { PageHeader } from "~app/components/page-header";
import { suspendedFallback } from "~app/components/suspense-wrapper";
import { ShowResolvedDebtsOption } from "~app/features/settings/show-resolved-debts-option";
import { useBooleanState } from "~app/hooks/use-boolean-state";
import { useLocale } from "~app/hooks/use-locale";
import { useShowResolvedDebts } from "~app/hooks/use-show-resolved-debts";
import { useTrpcMutationOptions } from "~app/hooks/use-trpc-mutation-options";
import { useTrpcMutationStates } from "~app/hooks/use-trpc-mutation-state";
import { getCurrencySymbol } from "~app/utils/currency";
import type { CurrencyCode } from "~app/utils/currency";
import { useAppForm } from "~app/utils/forms";
import { getPathHooks } from "~app/utils/navigation";
import { useTRPC } from "~app/utils/trpc";
import {
	currencyCodeSchema,
	debtAmountSchema,
	debtAmountSchemaDecimal,
} from "~app/utils/validation";
import { BackLink } from "~components/back-link";
import { Button } from "~components/button";
import { Icon } from "~components/icons";
import { Skeleton } from "~components/skeleton";
import { SkeletonNumberInput } from "~components/skeleton-number-input";
import { Text } from "~components/text";
import { cn } from "~components/utils";
import { View } from "~components/view";
import type { PeerId } from "~db/ids";
import { options as debtsAddOptions } from "~mutations/debts/add";

const formSchema = z
	.record(currencyCodeSchema, debtAmountSchema.or(z.literal(0)))
	.refine(
		(record) =>
			entries(record).some(
				([, sum]) => !Number.isNaN(sum) && Number.isFinite(sum) && sum !== 0,
			),
		{ message: "No non-zero transfers" },
	);
type Form = z.infer<typeof formSchema>;

/* oxlint-disable typescript/no-unnecessary-template-expression */
// Typescript is not as good with flavored types inside template literals
const transformCurrencyCode = (currencyCode: CurrencyCode): `${CurrencyCode}` =>
	currencyCode as `${CurrencyCode}`;
/* oxlint-enable typescript/no-unnecessary-template-expression */

const DebtsListForm = suspendedFallback<{
	fromPeerId: PeerId;
	toPeerId?: PeerId;
}>(
	({ fromPeerId, toPeerId }) => {
		const { t } = useTranslation("debts");
		const trpc = useTRPC();
		const [extraCurrencyCodes, setExtraCurrencyCodes] = React.useState<
			CurrencyCode[]
		>([]);

		const queryClient = useQueryClient();
		const { data: fromPeerData } = useSuspenseQuery(
			trpc.debts.getAllPeer.queryOptions({ peerId: fromPeerId }),
		);
		const { data: fromPeer } = useSuspenseQuery(
			trpc.peers.get.queryOptions({ id: fromPeerId }),
		);
		usePrefetchQuery(
			trpc.peers.get.queryOptions(toPeerId ? { id: toPeerId } : skipToken),
		);
		const [showResolvedDebts] = useShowResolvedDebts();
		const nonResolvedDebts = fromPeerData.items.filter(
			(element) => element.sum !== 0,
		);
		const aggregatedDebts = showResolvedDebts
			? fromPeerData.items
			: nonResolvedDebts;

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
				if (!toPeerId) {
					throw new Error(`Expected to have target peer id`);
				}
				const toPeer = queryClient.getQueryData(
					trpc.peers.get.queryOptions({ id: toPeerId }).queryKey,
				);
				if (!toPeer) {
					throw new Error(`Expected to have target peer`);
				}
				setLastMutationTimestamps(
					allCurrenciesWithSums.reduce<string[]>((acc, { currencyCode }) => {
						const amount = value[currencyCode] ?? 0;
						if (amount === 0) {
							return acc;
						}
						const fromMutationVars = {
							note: t("transfer.defaultNoteTo", {
								peer: toPeer.publicName || toPeer.name,
							}),
							currencyCode,
							peerId: fromPeerId,
							amount: -amount,
							timestamp: Temporal.Now.plainDateISO(),
						};
						addMutation.mutate(fromMutationVars);
						const toMutationVars = {
							note: t("transfer.defaultNoteFrom", {
								peer: fromPeer.publicName || fromPeer.name,
							}),
							currencyCode,
							peerId: toPeer.id,
							amount,
							timestamp: Temporal.Now.plainDateISO(),
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
			for (const { currencyCode, sum } of allCurrenciesWithSums) {
				if (sum !== null) {
					form.setFieldValue(transformCurrencyCode(currencyCode), sum);
				}
			}
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
					<form.Form
						className="flex flex-col gap-4"
						testID="debts-transfer-form"
					>
						<View className="flex gap-2">
							{allCurrenciesWithSums.length === 0 ? (
								<Text>{t("transfer.form.noDebts")}</Text>
							) : (
								<>
									<View className="flex-row gap-4 self-end">
										{fromPeerData.items.length ===
										nonResolvedDebts.length ? null : (
											<ShowResolvedDebtsOption />
										)}
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
														<Text className="flex-2">{currencySymbol}</Text>
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
															className="flex-6"
															aria-label={currencySymbol}
															color={
																field.state.value
																	? field.state.value > 0
																		? "success"
																		: "danger"
																	: "default"
															}
															startContent={
																<View
																	onPress={
																		field.state.value
																			? () =>
																					field.setValue(
																						(prevValue) => -prevValue,
																					)
																			: undefined
																	}
																	className={cn(
																		"size-4 rounded-sm",
																		field.state.value
																			? field.state.value > 0
																				? "bg-success"
																				: "bg-danger"
																			: "bg-default",
																	)}
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
																		<Icon className="size-6" name="trash" />
																	</Button>
																) : (
																	<View onPress={() => field.setValue(sum)}>
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
										!canSubmit || mutationPending || fromPeerId === toPeerId
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
	},
	() => {
		const { t } = useTranslation("debts");
		return (
			<View className="flex flex-col gap-4">
				<View className="flex gap-2">
					<Button color="secondary" className="self-end">
						{t("transfer.form.allMax")}
					</Button>
					{Array.from({ length: 3 }).map((_, index) => (
						// oxlint-disable-next-line react/no-array-index-key
						<View className="flex items-center gap-2 sm:flex-row" key={index}>
							<Skeleton className="h-6 w-8 flex-2 rounded-md" />
							<SkeletonNumberInput
								className="flex-6"
								startContent={<View className="bg-default size-4 rounded-sm" />}
								defaultValue={0}
								endContent={
									<View className="cursor-pointer">
										<Text>{t("transfer.form.max")}</Text>
									</View>
								}
							/>
						</View>
					))}
				</View>
				<Button color="primary" isDisabled>
					{t("transfer.form.submit")}
				</Button>
			</View>
		);
	},
);

export const DebtsTransferScreen = () => {
	const { useQueryState } = getPathHooks("/_protected/debts/transfer");
	const [fromId, setFromId] = useQueryState("from");
	const [toId, setToId] = useQueryState("to");
	const { t } = useTranslation("debts");
	const onFromClick = React.useCallback(
		(peerId: PeerId) => setFromId(fromId === peerId ? undefined : peerId),
		[fromId, setFromId],
	);
	const onToClick = React.useCallback(
		(peerId: PeerId) => setToId(toId === peerId ? undefined : peerId),
		[setToId, toId],
	);

	return (
		<>
			<PageHeader
				startContent={
					fromId ? (
						<BackLink to="/debts/peer/$id" params={{ id: fromId }} />
					) : (
						<BackLink to="/debts" />
					)
				}
			>
				{t("transfer.title")}
			</PageHeader>
			<View className="flex-row gap-2 self-center">
				<PeersSuggest
					label={t("transfer.form.from.label")}
					selected={fromId}
					onPeerClick={onFromClick}
					closeOnSelect
					setPeerNameToInput
					selectedProps={{ className: "flex flex-row gap-2 items-center" }}
				/>
				<Icon className="size-10" name="arrow-right" />
				<PeersSuggest
					label={t("transfer.form.to.label")}
					selected={toId}
					onPeerClick={onToClick}
					closeOnSelect
					setPeerNameToInput
					selectedProps={{ className: "flex flex-row gap-2 items-center" }}
				/>
			</View>
			{fromId ? (
				<DebtsListForm key={fromId} fromPeerId={fromId} toPeerId={toId} />
			) : null}
		</>
	);
};
