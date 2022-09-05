import React from "react";

import { Loading } from "@nextui-org/react";

import { DebtControlButtons } from "app/components/app/debt-control-buttons";
import { QueryErrorMessage } from "app/components/error-message";
import { trpc, TRPCQuerySuccessResult } from "app/trpc";
import { ReceiptsId } from "next-app/db/models";

type InnerProps = {
	query: TRPCQuerySuccessResult<"debts.getByReceiptId">;
};

export const ReceiptSelfDebtSyncInfoInner: React.FC<InnerProps> = ({
	query,
}) => {
	if (!query.data) {
		return null;
	}
	return <DebtControlButtons debt={query.data} hideLocked />;
};

type Props = Omit<InnerProps, "query"> & {
	receiptId: ReceiptsId;
};

export const ReceiptSelfDebtSyncInfo: React.FC<Props> = ({
	receiptId,
	...props
}) => {
	const debtQuery = trpc.useQuery(["debts.getByReceiptId", { receiptId }]);
	if (debtQuery.status === "loading") {
		return <Loading size="xs" />;
	}
	if (debtQuery.status === "error") {
		if (debtQuery.error.data?.code === "FORBIDDEN") {
			return null;
		}
		return <QueryErrorMessage query={debtQuery} />;
	}
	if (debtQuery.status === "idle") {
		return null;
	}
	return <ReceiptSelfDebtSyncInfoInner {...props} query={debtQuery} />;
};
