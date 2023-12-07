import React from "react";
import { View } from "react-native";

import { styled } from "@nextui-org/react";
import { Button, Divider } from "@nextui-org/react-tailwind";

import { ReceiptParticipantResolvedButton } from "app/components/app/receipt-participant-resolved-button";
import { ReceiptResolvedParticipantsButton } from "app/components/app/receipt-resolved-participants-button";
import { Text } from "app/components/base/text";
import { Link } from "app/components/link";
import { LockedIcon } from "app/components/locked-icon";
import { useFormattedCurrency } from "app/hooks/use-formatted-currency";
import { useSsrFormat } from "app/hooks/use-ssr-format";
import { useTrpcMutationOptions } from "app/hooks/use-trpc-mutation-options";
import { mutations } from "app/mutations";
import type { TRPCQueryOutput } from "app/trpc";
import { trpc } from "app/trpc";

const TitleLink = styled(Link, {
	display: "flex",
	flexDirection: "column",
	width: "100%",
});

type Props = {
	receipt: TRPCQueryOutput<"receipts.getPaged">["items"][number];
};

export const ReceiptPreview: React.FC<Props> = ({ receipt }) => {
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
		<>
			<TitleLink href={`/receipts/${receipt.id}/`} css={{ cursor: "pointer" }}>
				<Text>{receipt.name}</Text>
			</TitleLink>
			<Text className="text-default-400 text-xs">
				{formatDate(receipt.issued)}
			</Text>
		</>
	);
	const sum = (
		<Text className="font-medium">
			{receipt.sum} {currency}
		</Text>
	);
	return (
		<>
			<Divider className="sm:hidden" />
			<View className="flex-row gap-2 sm:hidden">
				<View className="flex-[7] p-2">{title}</View>
				<View className="flex-[2] flex-row justify-end p-2">{sum}</View>
			</View>
			<View className="mb-2 flex-row gap-2">
				<View className="flex-[7] p-2 max-sm:hidden">{title}</View>
				<View className="flex-[2] flex-row justify-end p-2 max-sm:hidden">
					{sum}
				</View>
				<View className="flex-1 flex-row justify-center p-2">
					{receipt.participantResolved === null ? null : (
						<ReceiptParticipantResolvedButton
							variant="light"
							receiptId={receipt.id}
							userId={receipt.remoteUserId}
							selfUserId={receipt.remoteUserId}
							resolved={receipt.participantResolved}
						/>
					)}
				</View>
				<View className="flex-1 flex-row justify-center p-2">
					<Button
						variant="light"
						isLoading={updateReceiptMutation.isLoading}
						isDisabled={receipt.role !== "owner"}
						color={receiptLocked ? "success" : "warning"}
						isIconOnly
						onClick={switchResolved}
					>
						<LockedIcon locked={receiptLocked} />
					</Button>
				</View>
				<View className="flex-1 flex-row justify-center p-2">
					<ReceiptResolvedParticipantsButton receiptId={receipt.id} />
				</View>
			</View>
		</>
	);
};
