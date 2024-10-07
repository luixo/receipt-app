import type React from "react";
import { View } from "react-native";

import { ReceiptResolvedParticipantsButton } from "~app/components/app/receipt-resolved-participants-button";
import { useFormattedCurrency } from "~app/hooks/use-formatted-currency";
import { useSsrFormat } from "~app/hooks/use-ssr-format";
import type { TRPCQueryOutput } from "~app/trpc";
import { Badge } from "~components/badge";
import { KeyIcon } from "~components/icons";
import { Link } from "~components/link";
import { Text } from "~components/text";
import { round } from "~utils/math";

import { ReceiptPreviewLockedButton } from "./receipt-preview-locked-button";

type InnerProps = {
	receipt: TRPCQueryOutput<"receipts.get">;
};

export const ReceiptPreview: React.FC<InnerProps> = ({ receipt }) => {
	const { formatDate } = useSsrFormat();
	const currency = useFormattedCurrency(receipt.currencyCode);
	const selfParticipant = receipt.participants.find(
		(participant) => participant.userId === receipt.selfUserId,
	);
	const isOwner = receipt.selfUserId === receipt.ownerUserId;
	const title = (
		<Link
			className="flex flex-col items-start"
			href={`/receipts/${receipt.id}/`}
		>
			<Badge
				content=""
				color="danger"
				placement="top-right"
				isInvisible={!selfParticipant || selfParticipant.resolved}
				isDot
				className="translate-x-full"
			>
				<Text>{receipt.name}</Text>
				{isOwner ? <KeyIcon size={12} /> : null}
			</Badge>
			<Text className="text-default-400 text-xs">
				{formatDate(receipt.issued)}
			</Text>
		</Link>
	);
	const sum = round(
		receipt.items.reduce((acc, item) => acc + item.price * item.quantity, 0),
	);
	const sumComponent = (
		<Text className="font-medium">
			{sum} {currency}
		</Text>
	);
	return (
		<View>
			<View className="flex-row gap-2 sm:hidden">
				<Text className="flex-[7] p-2">{title}</Text>
				<Text className="flex-[2] flex-row p-2 text-right">{sumComponent}</Text>
			</View>
			<View className="flex-row gap-2">
				<Text className="flex-[7] p-2 max-sm:hidden">{title}</Text>
				<Text className="flex-[2] flex-row self-center p-2 text-right max-sm:hidden">
					{sumComponent}
				</Text>
				<View className="flex-1 flex-row justify-center self-center p-2">
					{isOwner ? (
						<ReceiptResolvedParticipantsButton
							participants={receipt.participants}
						/>
					) : null}
				</View>
				<View className="flex-1 flex-row self-center p-2">
					<ReceiptPreviewLockedButton receipt={receipt} />
				</View>
			</View>
		</View>
	);
};
