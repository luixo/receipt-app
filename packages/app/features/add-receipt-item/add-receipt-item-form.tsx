import React from "react";

import { zodResolver } from "@hookform/resolvers/zod";
import { Button, Loading, Spacer, styled } from "@nextui-org/react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { cache } from "app/cache";
import { MutationErrorMessage } from "app/components/error-message";
import { useSubmitHandler } from "app/hooks/use-submit-handler";
import { useTrpcMutationOptions } from "app/hooks/use-trpc-mutation-options";
import { trpc } from "app/trpc";
import {
	priceSchema,
	quantitySchema,
	receiptItemNameSchema,
} from "app/utils/validation";
import { ReceiptsId } from "next-app/db/models";

import { ReceiptItemNameInput } from "./receipt-item-name-input";
import { ReceiptItemPriceInput } from "./receipt-item-price-input";
import { ReceiptItemQuantityInput } from "./receipt-item-quantity-input";
import { Form } from "./types";

const Inputs = styled("div", {
	display: "flex",

	"@xsMax": {
		flexDirection: "column",
	},
});

type Props = {
	receiptId: ReceiptsId;
	receiptLocked: boolean;
	isLoading: boolean;
	onDone: () => void;
};

export const AddReceiptItemForm: React.FC<Props> = ({
	receiptId,
	receiptLocked,
	isLoading: isDeleteLoading,
	onDone,
}) => {
	const inputsRef = React.useRef<HTMLDivElement>(null);
	React.useEffect(() => {
		inputsRef.current?.scrollIntoView();
	}, [inputsRef]);

	const addMutation = trpc.useMutation(
		"receiptItems.add",
		useTrpcMutationOptions(cache.receiptItems.add.mutationOptions, receiptId)
	);
	const form = useForm<Form>({
		mode: "onChange",
		resolver: zodResolver(
			z.object({
				name: receiptItemNameSchema,
				price: z.preprocess(Number, priceSchema),
				quantity: z.preprocess(Number, quantitySchema),
			})
		),
		defaultValues: {
			name: "",
			quantity: 1,
		},
	});
	const onSubmit = useSubmitHandler<Form>(
		(values) => addMutation.mutateAsync({ ...values, receiptId }),
		[addMutation, receiptId],
		onDone
	);

	const isLoading = isDeleteLoading || addMutation.isLoading;

	return (
		<>
			<Inputs ref={inputsRef}>
				<ReceiptItemNameInput form={form} isLoading={isLoading} />
				<Spacer x={1} />
				<ReceiptItemPriceInput form={form} isLoading={isLoading} />
				<Spacer x={1} />
				<ReceiptItemQuantityInput form={form} isLoading={isLoading} />
			</Inputs>
			<Spacer y={1} />
			<Button
				onClick={form.handleSubmit(onSubmit)}
				disabled={!form.formState.isValid || isLoading || receiptLocked}
				css={{ width: "100%" }}
			>
				{addMutation.isLoading ? <Loading size="xs" /> : "Save"}
			</Button>
			{addMutation.status === "error" ? (
				<>
					<Spacer y={1} />
					<MutationErrorMessage mutation={addMutation} />
				</>
			) : null}
		</>
	);
};
