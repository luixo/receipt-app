import React from "react";

import { Loading } from "@nextui-org/react";

import { DebtControlButtons } from "app/components/app/debt-control-buttons";
import { QueryErrorMessage } from "app/components/error-message";
import { trpc, TRPCQuerySuccessResult } from "app/trpc";
import { ReceiptsId } from "next-app/db/models";

type InnerProps = {
	query: TRPCQuerySuccessResult<"debts.get">;
};

export const ReceiptSelfDebtSyncInfoInner: React.FC<InnerProps> = ({
	query,
}) => {
	const debt = query.data;
	if (!debt) {
		return null;
	}
	return <DebtControlButtons debt={debt} hideLocked />;
};

type Props = Omit<InnerProps, "query"> & {
	receiptId: ReceiptsId;
};

export const ReceiptSelfDebtSyncInfo: React.FC<Props> = ({
	receiptId,
	...props
}) => {
	const query = trpc.useQuery(["debts.get", { receiptId }]);
	if (query.status === "loading") {
		return <Loading size="xs" />;
	}
	if (query.status === "error") {
		if (query.error.data?.code === "FORBIDDEN") {
			return null;
		}
		return <QueryErrorMessage query={query} />;
	}
	if (query.status === "idle") {
		return null;
	}
	return <ReceiptSelfDebtSyncInfoInner {...props} query={query} />;
};
