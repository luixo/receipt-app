import React from "react";

import { Loading, Spacer, Card, styled } from "@nextui-org/react";
import { useRouter } from "solito/router";

import { LoadableUser } from "app/components/app/loadable-user";
import { QueryErrorMessage } from "app/components/error-message";
import { Header } from "app/components/header";
import { trpc, TRPCQuerySuccessResult } from "app/trpc";
import { Currency } from "app/utils/currency";
import { UsersId } from "next-app/src/db/models";

import { UserAggregatedDebt } from "./user-aggregated-debt";
import { UserDebtPreview } from "./user-debt-preview";

const Flex = styled("div", {
	display: "flex",
	alignSelf: "center",
	fontSize: "$xl",
});
const Delimiter = styled("span", { mx: "$4" });

type InnerProps = {
	userId: UsersId;
	query: TRPCQuerySuccessResult<"debts.get-user">;
};

export const UserDebtsInner: React.FC<InnerProps> = ({ userId, query }) => {
	const debts = query.data;
	const router = useRouter();
	React.useEffect(() => {
		if (debts.length === 0) {
			router.replace("/debts");
		}
	}, [debts, router]);
	const aggregatedDebts = debts.reduce<Record<Currency, number>>(
		(acc, debt) => {
			if (!acc[debt.currency]) {
				acc[debt.currency] = 0;
			}
			acc[debt.currency] += debt.amount;
			return acc;
		},
		{}
	);
	return (
		<>
			<Header backHref="/debts">
				<LoadableUser id={userId} />
			</Header>
			<Spacer y={1} />
			<Flex>
				{Object.entries(aggregatedDebts).map(([currency, amount], index) => (
					<React.Fragment key={currency}>
						{index === 0 ? null : <Delimiter>•</Delimiter>}
						<UserAggregatedDebt amount={amount} currency={currency} />
					</React.Fragment>
				))}
			</Flex>
			<Spacer y={1} />
			{debts.map((debt) => (
				<React.Fragment key={debt.id}>
					<Card.Divider />
					<UserDebtPreview debt={debt} />
				</React.Fragment>
			))}
		</>
	);
};

type Props = Omit<InnerProps, "query">;

export const UserDebts: React.FC<Props> = ({ userId, ...props }) => {
	const query = trpc.useQuery(["debts.get-user", { userId }]);
	const userNameQuery = trpc.useQuery(["users.get-name", { id: userId }]);
	if (query.status === "loading") {
		return (
			<>
				<Header>{userNameQuery.data || userId}</Header>
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
	return <UserDebtsInner {...props} query={query} userId={userId} />;
};
