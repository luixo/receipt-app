import React from "react";
import { View } from "react-native";

import { Button, Link } from "@nextui-org/react";

import { ReceiptParticipantResolvedButton } from "app/components/app/receipt-participant-resolved-button";
import { ReceiptResolvedParticipantsButton } from "app/components/app/receipt-resolved-participants-button";
import { Text } from "app/components/base/text";
import { LockedIcon } from "app/components/locked-icon";
import { useFormattedCurrency } from "app/hooks/use-formatted-currency";
import { useSsrFormat } from "app/hooks/use-ssr-format";
import { useTrpcMutationOptions } from "app/hooks/use-trpc-mutation-options";
import { mutations } from "app/mutations";
import type { TRPCQueryOutput } from "app/trpc";
import { trpc } from "app/trpc";

type InnerProps = {
	receipt: TRPCQueryOutput<"receipts.get">;
};

export const ReceiptPreview: React.FC<InnerProps> = ({ receipt }) => {
	const { formatDate } = useSsrFormat();
	const currency = useFormattedCurrency(receipt.currencyCode);
	const updateReceiptMutation = trpc.receipts.update.useMutation(
		useTrpcMutationOptions(mutations.receipts.update.options),
	);
	const receiptLocked = Boolean(receipt.lockedTimestamp);
	const switchResolved = React.useCallback(() => {
		updateReceiptMutation.mutate({
			id: receipt.id,
			update: { type: "locked", locked: !receiptLocked },
		});
	}, [updateReceiptMutation, receipt.id, receiptLocked]);
	const title = (
		<Link
			className="flex flex-col items-start"
			href={`/receipts/${receipt.id}/`}
		>
			<Text>{receipt.name}</Text>
			<Text className="text-default-400 text-xs">
				{formatDate(receipt.issued)}
			</Text>
		</Link>
	);
	const sum = (
		<Text className="font-medium">
			{receipt.sum} {currency}
		</Text>
	);
	return (
		<View>
			<View className="flex-row gap-2 sm:hidden">
				<Text className="flex-[7] p-2">{title}</Text>
				<Text className="flex-[2] flex-row justify-end p-2">{sum}</Text>
			</View>
			<View className="flex-row gap-2">
				<Text className="flex-[7] p-2 max-sm:hidden">{title}</Text>
				<Text className="flex-[2] flex-row self-center p-2 text-right max-sm:hidden">
					{sum}
				</Text>
				<View className="flex-1 flex-row justify-center p-2">
					{receipt.participantResolved === null ? null : (
						<ReceiptParticipantResolvedButton
							variant="light"
							receiptId={receipt.id}
							userId={receipt.selfUserId}
							selfUserId={receipt.selfUserId}
							resolved={receipt.participantResolved}
						/>
					)}
				</View>
				<Button
					className="flex-1 flex-row self-center p-2"
					variant="light"
					isLoading={updateReceiptMutation.isPending}
					isDisabled={receipt.role !== "owner"}
					color={receiptLocked ? "success" : "warning"}
					isIconOnly
					onClick={switchResolved}
				>
					<LockedIcon locked={receiptLocked} />
				</Button>
				<ReceiptResolvedParticipantsButton
					className="flex-1 flex-row self-center p-2"
					receiptId={receipt.id}
				/>
			</View>
		</View>
	);
};
