import React from "react";

import { useTranslation } from "react-i18next";
import { z } from "zod";

import { PartButtons } from "~app/components/app/part-buttons";
import { useAutofocus } from "~app/hooks/use-autofocus";
import { useAutosave, useAutosaveEffect } from "~app/hooks/use-autosave";
import { useBooleanState } from "~app/hooks/use-boolean-state";
import { useRoundParts } from "~app/hooks/use-decimals";
import { useLocale } from "~app/hooks/use-locale";
import { useTrpcMutationState } from "~app/hooks/use-trpc-mutation-state";
import {
	getConsumeAllocation,
	getPartForFraction,
} from "~app/utils/consume-allocation";
import { formatCurrency } from "~app/utils/currency";
import { useAppForm } from "~app/utils/forms";
import { useTRPC } from "~app/utils/trpc";
import { partSchema, partSchemaDecimal } from "~app/utils/validation";
import { Button } from "~components/button";
import { Slider } from "~components/slider";
import { Text } from "~components/text";
import { View } from "~components/view";
import { round } from "~utils/math";

import { useActionsHooksContext, useReceiptContext } from "./context";
import { useCanEdit } from "./hooks";
import type { ConsumeType, Item } from "./state";

type Props = {
	consumer: Item["consumers"][number];
	item: Item;
	isDisabled: boolean;
	consumeType: ConsumeType;
};

export const ReceiptItemConsumerInput: React.FC<Props> = ({
	consumer,
	item,
	isDisabled: isExternalDisabled,
	consumeType,
}) => {
	const { t } = useTranslation("receipts");
	const { updateItemConsumerPart } = useActionsHooksContext();
	const { receiptDisabled, currencyCode } = useReceiptContext();
	const locale = useLocale();
	const canEdit = useCanEdit();
	const [isEditing, { setTrue: setEditing, setFalse: unsetEditing }] =
		useBooleanState();

	const trpc = useTRPC();
	const updateMutationState =
		useTrpcMutationState<"receiptItemConsumers.update">(
			trpc.receiptItemConsumers.update.mutationKey(),
			(vars) => vars.peerId === consumer.peerId && vars.itemId === item.id,
		);
	const isDisabled = isExternalDisabled || receiptDisabled;
	const {
		onSuccess,
		onSubmit,
		onSubmitImmediate,
		updateElement,
		eagerToSubmitState,
	} = useAutosave({
		isUpdatePending: updateMutationState?.status === "pending",
	});
	const form = useAppForm({
		defaultValues: { value: consumer.part },
		validators: { onChange: z.object({ value: partSchema }) },
		onSubmit: ({ value }) => {
			if (isDisabled || value.value === consumer.part) {
				return;
			}
			updateItemConsumerPart(item.id, consumer.peerId, value.value, {
				onSuccess,
			});
		},
		listeners: {
			onBlur: () => {
				onSubmitImmediate();
				unsetEditing();
			},
		},
	});
	useAutosaveEffect(form, { state: eagerToSubmitState });
	const { ref: inputRef, onKeyDownBlur } = useAutofocus({
		shouldFocus: isEditing,
	});

	const updateConsumerPart = React.useCallback(
		(setStateAction: React.SetStateAction<number>) => {
			form.setFieldValue("value", setStateAction);
			onSubmit();
		},
		[onSubmit, form],
	);

	const wrap = React.useCallback(
		(children: React.ReactElement) => (
			<form.Subscribe selector={(state) => state.values.value}>
				{(currentValue) => (
					<PartButtons
						updatePart={updateConsumerPart}
						downDisabled={currentValue <= 1}
					>
						{children}
					</PartButtons>
				)}
			</form.Subscribe>
		),
		[updateConsumerPart, form],
	);

	const roundParts = useRoundParts();
	const totalParts = roundParts(
		item.consumers.reduce((acc, itemConsumer) => acc + itemConsumer.part, 0),
	);
	const allocation =
		getConsumeAllocation(
			item.consumers,
			item.price,
			item.quantity,
			currencyCode,
		)[consumer.peerId] ?? 0;
	const fraction = totalParts ? consumer.part / totalParts : 0;
	const [sliderValue, setSliderValue] = React.useState<number | null>(null);
	if (consumeType !== "parts") {
		const isAmount = consumeType === "amount";
		const step = isAmount
			? 1 /
				10 **
					(new Intl.NumberFormat(locale, {
						style: "currency",
						currency: currencyCode,
					}).resolvedOptions().maximumFractionDigits ?? 2)
			: 1;
		const total = isAmount
			? Math.round((item.price * item.quantity) / step) * step
			: 100;
		const value = isAmount ? allocation : Math.round(fraction * 100);
		return (
			<View className="w-44 gap-1">
				<Text>
					{isAmount
						? formatCurrency(locale, currencyCode, allocation)
						: `${round(fraction * 100, 2)}%`}
				</Text>
				{canEdit && item.consumers.length > 1 && total > step ? (
					<Slider
						label={t("item.form.consumer.label")}
						value={sliderValue ?? value}
						minValue={step}
						maxValue={total - step}
						step={step}
						onChange={setSliderValue}
						onChangeEnd={(next) => {
							setSliderValue(null);
							const part = getPartForFraction(
								item.consumers,
								consumer.peerId,
								next / total,
							);
							if (part !== null && part !== consumer.part) {
								updateItemConsumerPart(item.id, consumer.peerId, part);
							}
						}}
						isDisabled={isDisabled}
					/>
				) : null}
			</View>
		);
	}

	const readOnlyComponent = (
		<form.Subscribe selector={(state) => state.values.value}>
			{(currentValue) => (
				<>
					<Text>
						{Number.isNaN(currentValue) ? "-" : currentValue} / {totalParts}
					</Text>
					<View className="absolute top-1 right-1">{updateElement}</View>
				</>
			)}
		</form.Subscribe>
	);

	if (!canEdit) {
		return readOnlyComponent;
	}

	if (isEditing) {
		return wrap(
			<form.AppField name="value">
				{(field) => (
					<field.NumberField
						ref={inputRef}
						value={field.state.value}
						onValueChange={field.setValue}
						name={field.name}
						onBlur={field.handleBlur}
						fieldError={
							field.state.meta.isDirty ? field.state.meta.errors : undefined
						}
						onKeyPress={onKeyDownBlur}
						fractionDigits={partSchemaDecimal}
						className="w-28"
						aria-label={t("item.form.consumer.label")}
						mutation={updateMutationState}
						continuousMutations
						isDisabled={isDisabled}
						labelPlacement="outside-left"
						endContent={<Text className="self-center">/ {totalParts}</Text>}
						variant="bordered"
					/>
				)}
			</form.AppField>,
		);
	}

	return wrap(
		<Button
			variant="light"
			onPress={setEditing}
			isDisabled={isDisabled}
			isIconOnly
			className="w-auto min-w-16 px-2"
		>
			{readOnlyComponent}
		</Button>,
	);
};
