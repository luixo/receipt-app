import React from "react";

import { Button, Loading, Spacer } from "@nextui-org/react";

import { cache } from "app/cache";
import { LoadableUser } from "app/components/app/loadable-user";
import { QueryErrorMessage } from "app/components/error-message";
import { Header } from "app/components/header";
import { useTrpcMutationOptions } from "app/hooks/use-trpc-mutation-options";
import { trpc, TRPCQuerySuccessResult } from "app/trpc";
import { DebtsId } from "next-app/src/db/models";

import { DebtAmountInput } from "./debt-amount-input";
import { DebtDateInput } from "./debt-date-input";
import { DebtNoteInput } from "./debt-note-input";
import { DebtRemoveButton } from "./debt-remove-button";

type InnerProps = {
	query: TRPCQuerySuccessResult<"debts.get">;
};

export const DebtInner: React.FC<InnerProps> = ({ query }) => {
	const debt = query.data;
	const updateMutation = trpc.useMutation(
		"debts.update",
		useTrpcMutationOptions(cache.debts.update.mutationOptions, debt)
	);
	const setDirection = React.useCallback(
		(direction: "+" | "-") => {
			if (
				(direction === "+" && debt.amount >= 0) ||
				(direction === "-" && debt.amount < 0)
			) {
				return;
			}
			return updateMutation.mutate({
				id: debt.id,
				update: { type: "amount", amount: debt.amount * -1 },
			});
		},
		[updateMutation, debt.id, debt.amount]
	);
	const [isRemoving, setRemoving] = React.useState(false);

	return (
		<>
			<Header>Debt</Header>
			<Spacer y={1} />
			<LoadableUser id={debt.userId} />
			<Spacer y={1} />
			<Button.Group
				color="success"
				animated={false}
				css={{ m: 0 }}
				disabled={isRemoving}
			>
				<Button
					onClick={() => setDirection("+")}
					bordered={debt.amount < 0}
					css={{ flex: "1" }}
				>
					{updateMutation.isLoading ? <Loading size="xs" /> : "+ give"}
				</Button>
				<Button
					onClick={() => setDirection("-")}
					bordered={debt.amount >= 0}
					css={{ flex: "1" }}
				>
					{updateMutation.isLoading ? <Loading size="xs" /> : "- take"}
				</Button>
			</Button.Group>
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
	const query = trpc.useQuery(["debts.get", { id }]);
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
	if (query.status === "idle") {
		return null;
	}
	return <DebtInner {...props} query={query} />;
};
