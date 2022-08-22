import React from "react";

import { Spacer, Card, styled } from "@nextui-org/react";

import { cache } from "app/cache";
import { LoadableUser } from "app/components/app/loadable-user";
import { Link } from "app/components/link";
import { trpc, TRPCQueryOutput } from "app/trpc";
import { UsersId } from "next-app/db/models";

import { UserDebtPreview } from "./user-debt-preview";

const Debts = styled("div", {
	display: "flex",
});

const Delimiter = styled("span", { mx: "$4" });

type Props = {
	debts: TRPCQueryOutput<"debts.get-by-users">[UsersId];
	userId: UsersId;
};

export const UserDebtsPreview: React.FC<Props> = ({ debts, userId }) => {
	const trpcContext = trpc.useContext();
	const userQuery = trpc.useQuery(["users.get", { id: userId }]);
	const setUserName = React.useCallback(() => {
		if (userQuery.status !== "success") {
			return;
		}
		cache.users.getName.add(
			trpcContext,
			userQuery.data.remoteId,
			userQuery.data.name
		);
	}, [trpcContext, userQuery]);
	return (
		<Card>
			<Link href={`/debts/user/${userId}`} color="text">
				<Card.Body onClick={setUserName}>
					<LoadableUser id={userId} />
					<Spacer y={1} />
					<Debts>
						{debts.map((debt, index) => (
							<React.Fragment key={debt.currency}>
								{index === 0 ? null : <Delimiter>•</Delimiter>}
								<UserDebtPreview debt={debt} />
							</React.Fragment>
						))}
					</Debts>
				</Card.Body>
			</Link>
		</Card>
	);
};
