import React from "react";

import { useTranslation } from "react-i18next";
import { z } from "zod";

import { PartButtons } from "~app/components/app/part-buttons";
import { useAutofocus } from "~app/hooks/use-autofocus";
import { useAutosave, useAutosaveEffect } from "~app/hooks/use-autosave";
import { useBooleanState } from "~app/hooks/use-boolean-state";
import { useRoundParts } from "~app/hooks/use-decimals";
import { useTrpcMutationState } from "~app/hooks/use-trpc-mutation-state";
import { useAppForm } from "~app/utils/forms";
import { useTRPC } from "~app/utils/trpc";
import { partSchema, partSchemaDecimal } from "~app/utils/validation";
import { Button } from "~components/button";
import { Text } from "~components/text";
import { View } from "~components/view";
import { updateSetStateAction } from "~utils/react";

import { useActionsHooksContext, useReceiptContext } from "./context";
import { useCanEdit } from "./hooks";
import type { Item } from "./state";

type Props = {
	consumer: Item["consumers"][number];
	item: Item;
	isDisabled: boolean;
};

export const ReceiptItemConsumerInput: React.FC<Props> = ({
	consumer,
	item,
	isDisabled: isExternalDisabled,
}) => {
	const { t } = useTranslation("receipts");
	const { updateItemConsumerPart, removeItemConsumer } =
		useActionsHooksContext();
	const { receiptDisabled } = useReceiptContext();
	const canEdit = useCanEdit();
	const [isEditing, { setTrue: setEditing, setFalse: unsetEditing }] =
		useBooleanState();

	const trpc = useTRPC();
	const updateMutationState =
		useTrpcMutationState<"receiptItemConsumers.update">(
			trpc.receiptItemConsumers.update.mutationKey(),
			(vars) => vars.peerId === consumer.peerId && vars.itemId === item.id,
		);

	const removeMutationState =
		useTrpcMutationState<"receiptItemConsumers.remove">(
			trpc.receiptItemConsumers.remove.mutationKey(),
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
		isUpdatePending:
			updateMutationState?.status === "pending" ||
			removeMutationState?.status === "pending",
	});
	const form = useAppForm({
		defaultValues: { value: consumer.part },
		validators: { onChange: z.object({ value: partSchema.or(z.literal(0)) }) },
		onSubmit: ({ value }) => {
			if (isDisabled || value.value === consumer.part) {
				return;
			}
			if (value.value === 0) {
				removeItemConsumer(item.id, consumer.peerId, { onSuccess });
			} else {
				updateItemConsumerPart(item.id, consumer.peerId, value.value, {
					onSuccess,
				});
			}
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
			const nextValue = Math.max(
				0,
				updateSetStateAction(setStateAction, form.getFieldValue("value")),
			);
			form.setFieldValue("value", nextValue);
			if (nextValue === 0) {
				onSubmitImmediate();
			} else {
				onSubmit();
			}
		},
		[onSubmit, onSubmitImmediate, form],
	);

	const wrap = React.useCallback(
		(children: React.ReactElement) => (
			<PartButtons updatePart={updateConsumerPart}>{children}</PartButtons>
		),
		[updateConsumerPart],
	);

	const roundParts = useRoundParts();
	const totalParts = roundParts(
		item.consumers.reduce((acc, itemConsumer) => acc + itemConsumer.part, 0),
	);

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
