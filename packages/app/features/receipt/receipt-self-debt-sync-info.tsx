import React from "react";

import { Loading } from "@nextui-org/react";

import { DebtControlButtons } from "app/components/app/debt-control-buttons";
import { QueryErrorMessage } from "app/components/error-message";
import { trpc } from "app/trpc";
import { ReceiptsId } from "next-app/db/models";

type Props = {
	receiptId: ReceiptsId;
};

export const ReceiptSelfDebtSyncInfo: React.FC<Props> = ({ receiptId }) => {
	const debtQuery = trpc.debts.get.useQuery({ receiptId });
	if (debtQuery.status === "loading") {
		return <Loading size="xs" />;
	}
	if (debtQuery.status === "error") {
		if (debtQuery.error.data?.code === "NOT_FOUND") {
			return null;
		}
		return <QueryErrorMessage query={debtQuery} />;
	}
	return <DebtControlButtons debt={debtQuery.data} hideLocked />;
};
