import React from "react";

import { Spacer, Spinner } from "@nextui-org/react-tailwind";

import { DebtControlButtons } from "app/components/app/debt-control-buttons";
import { DebtSyncStatus } from "app/components/app/debt-sync-status";
import { LoadableUser } from "app/components/app/loadable-user";
import { QueryErrorMessage } from "app/components/error-message";
import { Header } from "app/components/header";
import { useFormattedCurrency } from "app/hooks/use-formatted-currency";
import type { TRPCQuerySuccessResult } from "app/trpc";
import { trpc } from "app/trpc";
import type { DebtsId } from "next-app/src/db/models";

import { DebtAmountInput } from "./debt-amount-input";
import { DebtDateInput } from "./debt-date-input";
import { DebtNoteInput } from "./debt-note-input";
import { DebtReceiptLink } from "./debt-receipt-link";
import { DebtRemoveButton } from "./debt-remove-button";
import { DebtSignButtonGroup } from "./debt-sign-button-group";

type InnerProps = {
	query: TRPCQuerySuccessResult<"debts.get">;
};

export const DebtInner: React.FC<InnerProps> = ({ query }) => {
	const debt = query.data;
	const [isRemoving, setRemoving] = React.useState(false);
	const currency = useFormattedCurrency(debt.currencyCode);

	return (
		<>
			<Header
				backHref={`/debts/user/${debt.userId}`}
				aside={<DebtControlButtons debt={debt} />}
				textChildren={`${debt.amount} ${currency} debt`}
			>
				<>
					{debt.amount} {currency} debt
					<Spacer x={4} />
					<DebtSyncStatus debt={debt} size={36} />
					{debt.receiptId ? (
						<>
							<Spacer x={4} />
							<DebtReceiptLink receiptId={debt.receiptId} />
						</>
					) : null}
				</>
			</Header>
			<Spacer y={4} />
			<LoadableUser id={debt.userId} />
			<Spacer y={4} />
			<DebtSignButtonGroup debt={debt} disabled={isRemoving} />
			<Spacer y={4} />
			<DebtAmountInput debt={debt} isLoading={isRemoving} />
			<Spacer y={4} />
			<DebtDateInput debt={debt} isLoading={isRemoving} />
			<Spacer y={4} />
			<DebtNoteInput debt={debt} isLoading={isRemoving} />
			<Spacer y={4} />
			<DebtRemoveButton debt={debt} setLoading={setRemoving} />
		</>
	);
};

type Props = Omit<InnerProps, "query"> & {
	id: DebtsId;
};

export const Debt: React.FC<Props> = ({ id, ...props }) => {
	const query = trpc.debts.get.useQuery({ id });
	if (query.status === "loading") {
		return (
			<>
				<Header>Debt</Header>
				<Spinner />
			</>
		);
	}
	if (query.status === "error") {
		return <QueryErrorMessage query={query} />;
	}
	return <DebtInner {...props} query={query} />;
};
