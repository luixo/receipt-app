import React from "react";
import { View } from "react-native";

import { useTranslation } from "react-i18next";
import { z } from "zod";

import { PartButtons } from "~app/components/app/part-buttons";
import { useBooleanState } from "~app/hooks/use-boolean-state";
import { useRoundParts } from "~app/hooks/use-decimals";
import { useTrpcMutationState } from "~app/hooks/use-trpc-mutation-state";
import { useAppForm } from "~app/utils/forms";
import { useTRPC } from "~app/utils/trpc";
import { partSchema, partSchemaDecimal } from "~app/utils/validation";
import { Button } from "~components/button";
import { SaveButton } from "~components/save-button";
import { Text } from "~components/text";
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
	const { updateItemConsumerPart } = useActionsHooksContext();
	const { receiptDisabled } = useReceiptContext();
	const canEdit = useCanEdit();
	const [isEditing, { switchValue: switchEditing, setFalse: unsetEditing }] =
		useBooleanState();

	const trpc = useTRPC();
	const updateMutationState =
		useTrpcMutationState<"receiptItemConsumers.update">(
			trpc.receiptItemConsumers.update.mutationKey(),
			(vars) => vars.userId === consumer.userId && vars.itemId === item.id,
		);
	const form = useAppForm({
		defaultValues: { value: consumer.part },
		validators: { onChange: z.object({ value: partSchema }) },
		onSubmit: ({ value }) => {
			updateItemConsumerPart(item.id, consumer.userId, value.value, {
				onSuccess: unsetEditing,
			});
		},
	});
	const isPending = updateMutationState?.status === "pending";

	const updateConsumerPart = React.useCallback(
		(setStateAction: React.SetStateAction<number>) => {
			const nextPart = updateSetStateAction(setStateAction, consumer.part);
			if (nextPart === consumer.part) {
				unsetEditing();
				return;
			}
			form.setFieldValue("value", nextPart);
			void form.handleSubmit();
		},
		[consumer.part, form, unsetEditing],
	);

	const wrap = React.useCallback(
		(children: React.ReactElement) => (
			<PartButtons
				isPending={isPending}
				updatePart={updateConsumerPart}
				downDisabled={consumer.part <= 1}
			>
				{children}
			</PartButtons>
		),
		[updateConsumerPart, consumer.part, isPending],
	);

	const roundParts = useRoundParts();
	const totalParts = roundParts(
		item.consumers.reduce((acc, itemConsumer) => acc + itemConsumer.part, 0),
	);

	const readOnlyComponent = (
		<Text>
			{consumer.part} / {totalParts}
		</Text>
	);

	if (!canEdit) {
		return readOnlyComponent;
	}

	const isDisabled = isExternalDisabled || receiptDisabled;

	if (isEditing) {
		return wrap(
			<form.AppField name="value">
				{(field) => (
					<field.NumberField
						value={field.state.value}
						onValueChange={field.setValue}
						name={field.name}
						onBlur={field.handleBlur}
						fieldError={
							field.state.meta.isDirty ? field.state.meta.errors : undefined
						}
						fractionDigits={partSchemaDecimal}
						className="w-32"
						aria-label={t("item.form.consumer.label")}
						mutation={updateMutationState}
						isDisabled={isDisabled}
						labelPlacement="outside-left"
						endContent={
							<View className="flex gap-2">
								<Text className="self-center">/ {totalParts}</Text>
								<form.Subscribe selector={(state) => state.canSubmit}>
									{(canSubmit) => (
										<SaveButton
											title={t("item.form.consumer.saveButton")}
											onPress={() => {
												void field.form.handleSubmit();
											}}
											isLoading={updateMutationState?.status === "pending"}
											isDisabled={isDisabled || !canSubmit}
										/>
									)}
								</form.Subscribe>
							</View>
						}
						variant="bordered"
					/>
				)}
			</form.AppField>,
		);
	}

	return wrap(
		<Button
			variant="light"
			onPress={switchEditing}
			isDisabled={isDisabled}
			isIconOnly
			className="w-auto min-w-16 px-2"
		>
			{readOnlyComponent}
		</Button>,
	);
};
