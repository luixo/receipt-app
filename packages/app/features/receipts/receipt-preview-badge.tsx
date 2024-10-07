import type React from "react";

import { useParticipants } from "~app/hooks/use-participants";
import type { TRPCQueryOutput } from "~app/trpc";
import { Badge } from "~components/badge";

type Props = {
	receipt: TRPCQueryOutput<"receipts.get">;
	children: React.ReactNode;
};

export const ReceiptPreviewBadge: React.FC<Props> = ({ receipt, children }) => {
	const { syncableParticipants, desyncedParticipants, nonCreatedParticipants } =
		useParticipants(receipt);
	const notSynced =
		desyncedParticipants.length !== 0 || nonCreatedParticipants.length !== 0;
	if (receipt.selfUserId === receipt.ownerUserId) {
		return (
			<Badge
				content=""
				color="warning"
				placement="top-right"
				isInvisible={syncableParticipants.length === 0 ? true : !notSynced}
				isDot
				className="translate-x-full"
			>
				{children}
			</Badge>
		);
	}
	return <>{children}</>;
};
