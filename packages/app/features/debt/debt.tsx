import React from "react";

import { Loading, Spacer } from "@nextui-org/react";

import { DebtControlButtons } from "app/components/app/debt-control-buttons";
import { DebtSyncStatus } from "app/components/app/debt-sync-status";
import { LoadableUser } from "app/components/app/loadable-user";
import { QueryErrorMessage } from "app/components/error-message";
import { Header } from "app/components/header";
import { trpc, TRPCQuerySuccessResult } from "app/trpc";
import { DebtsId } from "next-app/src/db/models";

import { DebtAmountInput } from "./debt-amount-input";
import { DebtDateInput } from "./debt-date-input";
import { DebtNoteInput } from "./debt-note-input";
import { DebtRemoveButton } from "./debt-remove-button";
import { DebtSignButtonGroup } from "./debt-sign-button-group";

type InnerProps = {
	query: TRPCQuerySuccessResult<"debts.get">;
};

export const DebtInner: React.FC<InnerProps> = ({ query }) => {
	const debt = query.data;
	const [isRemoving, setRemoving] = React.useState(false);

	return (
		<>
			<Header
				backHref={`/debts/user/${debt.userId}`}
				aside={<DebtControlButtons debt={debt} />}
			>
				<>
					Debt
					<Spacer x={1} />
					<DebtSyncStatus
						status={debt.status}
						intentionDirection={debt.intentionDirection}
						size={36}
					/>
				</>
			</Header>
			<Spacer y={1} />
			<LoadableUser id={debt.userId} />
			<Spacer y={1} />
			<DebtSignButtonGroup debt={debt} disabled={isRemoving} />
			<Spacer y={1} />
			<DebtAmountInput debt={debt} isLoading={isRemoving} />
			<Spacer y={1} />
			<DebtDateInput debt={debt} isLoading={isRemoving} />
			<Spacer y={1} />
			<DebtNoteInput debt={debt} isLoading={isRemoving} />
			<Spacer y={1} />
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
				<Loading />
			</>
		);
	}
	if (query.status === "error") {
		return <QueryErrorMessage query={query} />;
	}
	return <DebtInner {...props} query={query} />;
};
