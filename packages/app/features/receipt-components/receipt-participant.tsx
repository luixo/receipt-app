import React from "react";
import { View } from "react-native";

import { skipToken, useQuery, useSuspenseQuery } from "@tanstack/react-query";
import type { TFunction } from "i18next";
import { useTranslation } from "react-i18next";
import { z } from "zod";

import { LoadableUser } from "~app/components/app/loadable-user";
import { PartButtons } from "~app/components/app/part-buttons";
import { RemoveButton } from "~app/components/remove-button";
import { suspendedFallback } from "~app/components/suspense-wrapper";
import { useAutofocus } from "~app/hooks/use-autofocus";
import { useAutosave, useAutosaveEffect } from "~app/hooks/use-autosave";
import { useDecimals, useRoundParts } from "~app/hooks/use-decimals";
import { useLocale } from "~app/hooks/use-locale";
import { useTrpcMutationState } from "~app/hooks/use-trpc-mutation-state";
import type { TRPCQueryOutput } from "~app/trpc";
import { formatCurrency } from "~app/utils/currency";
import { useAppForm } from "~app/utils/forms";
import { useTRPC } from "~app/utils/trpc";
import { partSchema, partSchemaDecimal } from "~app/utils/validation";
import { Accordion, AccordionItem } from "~components/accordion";
import { Button } from "~components/button";
import { Divider } from "~components/divider";
import { MoneyIcon } from "~components/icons";
import { Text } from "~components/text";
import { Tooltip } from "~components/tooltip";
import { getMutationLoading } from "~components/utils";
import { round } from "~utils/math";

import { useActionsHooksContext, useReceiptContext } from "./context";
import { useIsOwner } from "./hooks";
import { ReceiptParticipantRoleInput } from "./receipt-participant-role-input";
import type { Participant } from "./state";

const getParticipantError = (
	t: TFunction<"receipts">,
	participant: Participant,
	debt: TRPCQueryOutput<"debts.get"> | undefined,
	hasConnectedAccount: boolean,
	isOwner: boolean,
	isSelfParticipant: boolean,
	fromSubunitToUnit: (input: number) => number,
) => {
	if (!isOwner && !isSelfParticipant) {
		// We don't have data on foreign debts with a foreign receipt
		return;
	}
	if (isOwner && isSelfParticipant) {
		// We don't have debt for ourselves
		return;
	}
	const sum = fromSubunitToUnit(
		participant.debtSumDecimals - participant.paySumDecimals,
	);
	if (sum === 0) {
		return;
	}
	if (!debt) {
		// No debt has been propagated
		return {
			className: "text-warning",
			content: t("participant.errors.noOurs"),
		};
	}
	const expectedSum = isOwner ? sum : -sum;
	if (debt.amount !== expectedSum) {
		// Our debt is desynced from the receipt
		return {
			className: "text-danger",
			content: t("participant.errors.desyncedOurs", {
				actual: debt.amount,
				expected: expectedSum,
			}),
		};
	}
	if (!hasConnectedAccount) {
		// Debt is not syncable
		return;
	}
	if (!debt.their) {
		// Our debts exists, their does not
		return {
			className: "text-warning",
			content: t("participant.errors.noTheir"),
		};
	}
	if (debt.amount !== debt.their.amount) {
		// Our debt is desynced from their debt
		return {
			className: "text-warning",
			content: t("participant.errors.desyncedTheir", {
				actual: debt.their.amount,
				expected: debt.amount,
			}),
		};
	}
	// In sync
};

const RenderParticipantError = suspendedFallback<{
	participant: Participant;
	children: (error: ReturnType<typeof getParticipantError>) => React.ReactNode;
}>(
	({ children, participant }) => {
		const trpc = useTRPC();
		const { data: debt } = useQuery(
			trpc.debts.get.queryOptions(
				participant.debtId ? { id: participant.debtId } : skipToken,
				{ enabled: Boolean(participant.debtId) },
			),
		);
		const { data: user } = useSuspenseQuery(
			trpc.users.get.queryOptions({ id: participant.userId }),
		);
		const { t } = useTranslation("receipts");
		const { fromSubunitToUnit } = useDecimals();
		const { selfUserId } = useReceiptContext();
		const isOwner = useIsOwner();
		const error = getParticipantError(
			t,
			participant,
			debt,
			Boolean(user.connectedAccount),
			isOwner,
			participant.userId === selfUserId,
			fromSubunitToUnit,
		);
		return children(error);
	},
	({ children }) => <>{children(undefined)}</>,
);

type Props = {
	participant: Participant;
};

export const ReceiptParticipant: React.FC<Props> = ({ participant }) => {
	const { t } = useTranslation("receipts");
	const trpc = useTRPC();
	const {
		receiptId,
		currencyCode,
		renderParticipantActions,
		items,
		participants,
	} = useReceiptContext();
	const { removeParticipant, updatePayerPart, addPayer, removePayer } =
		useActionsHooksContext();
	const isOwner = useIsOwner();
	const { fromSubunitToUnit } = useDecimals();

	const currentPart = participant.payPart ?? 0;
	const addPayerMutationState =
		useTrpcMutationState<"receiptItemConsumers.add">(
			trpc.receiptItemConsumers.add.mutationKey(),
			(vars) => vars.itemId === receiptId && vars.userId === participant.userId,
		);
	const removePayerMutationState =
		useTrpcMutationState<"receiptItemConsumers.remove">(
			trpc.receiptItemConsumers.remove.mutationKey(),
			(vars) => vars.itemId === receiptId && vars.userId === participant.userId,
		);
	const updatePayerMutationState =
		useTrpcMutationState<"receiptItemConsumers.update">(
			trpc.receiptItemConsumers.update.mutationKey(),
			(vars) => vars.itemId === receiptId && vars.userId === participant.userId,
		);
	const isPayerPending = getMutationLoading([
		addPayerMutationState,
		removePayerMutationState,
		updatePayerMutationState,
	]);
	const {
		onSuccess,
		onSubmit,
		onSubmitImmediate,
		updateElement,
		eagerToSubmitState,
	} = useAutosave({ isUpdatePending: isPayerPending });
	const form = useAppForm({
		defaultValues: { value: currentPart },
		validators: { onChange: z.object({ value: partSchema.or(z.literal(0)) }) },
		onSubmit: ({ value }) => {
			if (value.value === currentPart) {
				return;
			}
			if (value.value === 0) {
				removePayer(participant.userId, { onSuccess });
			} else if (currentPart === 0 && value.value === 1) {
				addPayer(participant.userId, value.value, { onSuccess });
			} else {
				updatePayerPart(participant.userId, value.value, { onSuccess });
			}
		},
		listeners: {
			onBlur: onSubmitImmediate,
		},
	});
	useAutosaveEffect(form, { state: eagerToSubmitState });
	const { ref: inputRef, onKeyDownBlur } = useAutofocus<HTMLInputElement>({
		shouldFocus: true,
	});

	const removeParticipantMutationState =
		useTrpcMutationState<"receiptParticipants.remove">(
			trpc.receiptParticipants.remove.mutationKey(),
			(vars) =>
				vars.receiptId === receiptId && vars.userId === participant.userId,
		);
	const isPending = removeParticipantMutationState?.status === "pending";
	const removeReceiptParticipant = React.useCallback(() => {
		removeParticipant(participant.userId);
		form.setFieldValue("value", 0);
	}, [form, participant.userId, removeParticipant]);
	const onAddPayer = React.useCallback(() => {
		form.setFieldValue("value", 1);
		onSubmitImmediate();
	}, [form, onSubmitImmediate]);
	const onPartUpdate = React.useCallback(
		(setStateAction: React.SetStateAction<number>) => {
			form.setFieldValue("value", setStateAction);
			const value = form.getFieldValue("value");
			if (value === 0) {
				onSubmitImmediate();
			} else {
				onSubmit();
			}
		},
		[form, onSubmit, onSubmitImmediate],
	);

	const locale = useLocale();
	const disabled = participant.items.length === 0;
	const sum = fromSubunitToUnit(
		participant.debtSumDecimals - participant.paySumDecimals,
	);
	const roundParts = useRoundParts();
	const totalPayParts = roundParts(
		participants.reduce((acc, { payPart }) => acc + (payPart ?? 0), 0),
	);

	return (
		<Accordion>
			<AccordionItem
				key="parts"
				textValue={t("participant.title", { userId: participant.userId })}
				title={
					<View className="flex-col items-start justify-between gap-2 min-[600px]:flex-row">
						<View className="flex flex-row items-center gap-1">
							{currentPart ? (
								<MoneyIcon className="text-secondary" size={24} />
							) : null}
							<LoadableUser
								className={
									disabled && !currentPart ? "opacity-disabled" : undefined
								}
								id={participant.userId}
								foreign={!isOwner}
							/>
						</View>
						<View className="flex-row items-center justify-between gap-4 self-stretch">
							<RenderParticipantError participant={participant}>
								{(error) => (
									<Tooltip content={error?.content} isDisabled={!error}>
										<View>
											<Text className={error?.className}>
												{formatCurrency(locale, currencyCode, round(sum))}
											</Text>
										</View>
									</Tooltip>
								)}
							</RenderParticipantError>
							<View className="flex-row items-center gap-2">
								{isOwner ? (
									<RemoveButton
										onRemove={removeReceiptParticipant}
										mutation={{ isPending }}
										subtitle={t("participants.remove.confirmSubtitle")}
										noConfirm={
											participant.debtSumDecimals === 0 &&
											participant.paySumDecimals === 0
										}
										isIconOnly
									/>
								) : null}
							</View>
						</View>
					</View>
				}
			>
				<View className="flex gap-3">
					<View className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
						<View className="flex flex-row items-center gap-2">
							<form.Subscribe selector={(state) => state.values.value}>
								{(currentValue) =>
									currentValue !== 0 ? (
										<>
											<Text>{t("participant.payedInfix")}</Text>
											<PartButtons
												updatePart={onPartUpdate}
												downDisabled={currentValue <= 0}
											>
												<form.AppField name="value">
													{(field) => (
														<field.NumberField
															ref={inputRef}
															value={field.state.value}
															onValueChange={field.setValue}
															name={field.name}
															onBlur={field.handleBlur}
															fieldError={
																field.state.meta.isDirty
																	? field.state.meta.errors
																	: undefined
															}
															onKeyDown={onKeyDownBlur}
															className="w-28"
															aria-label={t("participant.form.payerPart.label")}
															mutation={[
																addPayerMutationState,
																removePayerMutationState,
																updatePayerMutationState,
															]}
															continuousMutations
															labelPlacement="outside-left"
															fractionDigits={partSchemaDecimal}
															hideStepper
															endContent={
																<View className="flex flex-row items-center gap-1">
																	<Text className="shrink-0 self-center">
																		{t("participant.form.payerPart.postfix", {
																			parts: totalPayParts,
																		})}
																	</Text>
																	<View className="absolute -right-2 -top-1">
																		{updateElement}
																	</View>
																</View>
															}
															variant="bordered"
														/>
													)}
												</form.AppField>
											</PartButtons>
										</>
									) : (
										<>
											<Button onPress={onAddPayer}>
												{t("participant.form.addPayerButton")}
											</Button>
											<View className="absolute -right-0.5 -top-0.5">
												{updateElement}
											</View>
										</>
									)
								}
							</form.Subscribe>
						</View>
						<View className="flex flex-row items-center gap-2 self-end">
							{renderParticipantActions(participant)}
							<ReceiptParticipantRoleInput participant={participant} />
						</View>
					</View>
					{currentPart && items.length !== 0 ? <Divider /> : null}
					<View className="flex flex-col gap-3">
						{currentPart && items.length !== 0 ? (
							<Text className="text-secondary">
								{t("participant.payerPart", {
									amount: formatCurrency(
										locale,
										currencyCode,
										fromSubunitToUnit(participant.paySumDecimals),
									),
								})}
							</Text>
						) : null}
						<View>
							{currentPart && participant.items.length > 1 ? (
								<Text className="text-secondary">
									{t("participant.consumerPart", {
										amount: formatCurrency(
											locale,
											currencyCode,
											fromSubunitToUnit(participant.debtSumDecimals),
										),
									})}
								</Text>
							) : null}
							{participant.items.map((item) => (
								<Text key={item.id}>
									{t("participant.partDescription", {
										item: item.name,
										amount: formatCurrency(
											locale,
											currencyCode,
											round(item.sum),
										),
										extraSymbol: item.hasExtra ? "*" : "",
									})}
								</Text>
							))}
						</View>
					</View>
				</View>
			</AccordionItem>
		</Accordion>
	);
};
