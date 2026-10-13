import React from "react";

import { useMutation } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";

import { RemoveComponent } from "~app/components/remove-button";
import { NavigationContext } from "~app/contexts/navigation-context";
import { useTrpcMutationOptions } from "~app/hooks/use-trpc-mutation-options";
import type { Receipt } from "~app/trpc-types";
import { useTRPC } from "~app/utils/trpc";
import { Button } from "~components/button";
import { Dropdown } from "~components/dropdown";
import { Icon } from "~components/icons";
import { Text } from "~components/text";
import { View } from "~components/view";
import { options as receiptsRemoveOptions } from "~mutations/receipts/remove";

type Props = {
	receipt: Receipt;
	setLoading: (nextLoading: boolean) => void;
};

export const ReceiptRemoveButton: React.FC<Props> = ({
	receipt,
	setLoading,
}) => {
	const { t } = useTranslation("receipts");
	const trpc = useTRPC();
	const { useNavigate } = React.use(NavigationContext);
	const navigate = useNavigate();
	const removeReceiptMutation = useMutation(
		trpc.receipts.remove.mutationOptions(
			useTrpcMutationOptions(receiptsRemoveOptions, {
				onSuccess: () => navigate({ to: "/receipts", replace: true }),
			}),
		),
	);
	React.useEffect(
		() => setLoading(removeReceiptMutation.isPending),
		[removeReceiptMutation.isPending, setLoading],
	);
	const removeReceipt = React.useCallback(
		() => removeReceiptMutation.mutate({ id: receipt.id }),
		[removeReceiptMutation, receipt.id],
	);

	return (
		<Dropdown
			items={[
				{
					key: "remove",
					children: (
						<RemoveComponent
							onRemove={removeReceipt}
							mutation={removeReceiptMutation}
							subtitle={t("receipt.removeButton.confirmSubtitle")}
						>
							{({ openModal }) => (
								<View
									className="text-danger flex-row items-center gap-1"
									onPress={
										receipt.items.length === 0 ? removeReceipt : openModal
									}
								>
									<Icon name="trash" className="m-1 size-4" />
									<Text>{t("receipt.removeButton.text")}</Text>
								</View>
							)}
						</RemoveComponent>
					),
				},
			]}
		>
			<Button variant="outline" isIconOnly>
				<Icon name="ellipsis" className="size-4" />
			</Button>
		</Dropdown>
	);
};
