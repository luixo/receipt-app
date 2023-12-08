import React from "react";
import { View } from "react-native";

import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@nextui-org/react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { useTrpcMutationOptions } from "app/hooks/use-trpc-mutation-options";
import { mutations } from "app/mutations";
import { trpc } from "app/trpc";
import {
	priceSchema,
	quantitySchema,
	receiptItemNameSchema,
} from "app/utils/validation";
import type { ReceiptsId } from "next-app/db/models";

import { ReceiptItemNameInput } from "./receipt-item-name-input";
import { ReceiptItemPriceInput } from "./receipt-item-price-input";
import { ReceiptItemQuantityInput } from "./receipt-item-quantity-input";
import type { Form } from "./types";

type Props = {
	receiptId: ReceiptsId;
	receiptLocked: boolean;
	isLoading: boolean;
};

export const AddReceiptItemForm: React.FC<Props> = ({
	receiptId,
	receiptLocked,
	isLoading: isDeleteLoading,
}) => {
	const form = useForm<Form>({
		mode: "onChange",
		resolver: zodResolver(
			z.object({
				name: receiptItemNameSchema,
				price: z.preprocess(Number, priceSchema),
				quantity: z.preprocess(Number, quantitySchema),
			}),
		),
		defaultValues: {
			name: "",
			// TODO: fix numbers in forms
			price: "" as unknown as number,
			quantity: 1,
		},
	});
	const addMutation = trpc.receiptItems.add.useMutation(
		useTrpcMutationOptions(mutations.receiptItems.add.options, {
			context: receiptId,
			onSuccess: () => form.reset(),
		}),
	);
	const onSubmit = React.useCallback(
		(values: Form) => addMutation.mutate({ ...values, receiptId }),
		[addMutation, receiptId],
	);

	const isLoading = isDeleteLoading || addMutation.isLoading;

	return (
		<View className="gap-4">
			<View className="flex-row gap-4">
				<ReceiptItemNameInput form={form} isLoading={isLoading} />
				<ReceiptItemPriceInput form={form} isLoading={isLoading} />
				<ReceiptItemQuantityInput form={form} isLoading={isLoading} />
			</View>
			<Button
				color="primary"
				onClick={form.handleSubmit(onSubmit)}
				isDisabled={!form.formState.isValid || isLoading || receiptLocked}
				className="w-full"
				isLoading={addMutation.isLoading}
			>
				Save
			</Button>
		</View>
	);
};
