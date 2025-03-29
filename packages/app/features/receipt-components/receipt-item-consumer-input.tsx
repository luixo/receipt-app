import React from "react";

import { z } from "zod";

import { PartButtons } from "~app/components/app/part-buttons";
import { useBooleanState } from "~app/hooks/use-boolean-state";
import { useRoundParts } from "~app/hooks/use-decimals";
import { useTrpcMutationState } from "~app/hooks/use-trpc-mutation-state";
import { trpc } from "~app/trpc";
import { useAppForm } from "~app/utils/forms";
import { partSchema, partSchemaDecimal } from "~app/utils/validation";
import { Button } from "~components/button";
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
	const { updateItemConsumerPart } = useActionsHooksContext();
	const { receiptDisabled } = useReceiptContext();
	const canEdit = useCanEdit();
	const [isEditing, { switchValue: switchEditing, setFalse: unsetEditing }] =
		useBooleanState();

	const updateMutationState =
		useTrpcMutationState<"receiptItemConsumers.update">(
			trpc.receiptItemConsumers.update,
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
						fieldError={field.state.meta.errors}
						step={10 ** -partSchemaDecimal}
						className="w-32"
						aria-label="Item consumer part"
						mutation={updateMutationState}
						isDisabled={isDisabled}
						labelPlacement="outside-left"
						saveProps={{
							title: "Save item consumer part",
							onPress: () => {
								void field.form.handleSubmit();
							},
						}}
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
			onPress={switchEditing}
			isDisabled={isDisabled}
			isIconOnly
			className="w-auto min-w-16 px-2"
		>
			{readOnlyComponent}
		</Button>,
	);
};
