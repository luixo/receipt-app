import React from "react";

import { Spacer, Card } from "@nextui-org/react";

import { cache } from "app/cache";
import { User } from "app/components/app/user";
import { Link } from "app/components/link";
import { trpc, TRPCQueryOutput } from "app/trpc";
import { UsersId } from "next-app/db/models";

import { UserDebtPreview } from "./user-debt-preview";

type Props = {
	debts: TRPCQueryOutput<"debts.get-by-users">[UsersId]["debts"];
	user: TRPCQueryOutput<"debts.get-by-users">[UsersId]["user"];
};

export const UserDebtsPreview: React.FC<Props> = ({ debts, user }) => {
	const trpcContext = trpc.useContext();
	const setUserName = React.useCallback(
		() => cache.users.getName.add(trpcContext, user.id, user.name),
		[trpcContext, user.id, user.name]
	);
	return (
		<Card>
			<Link href={`/debts/user/${userId}`} color="text">
				<Card.Body onClick={setUserName}>
					<User user={user} />
					<Spacer y={1} />
					<div>
						{debts.map((debt, index) => (
							<React.Fragment key={debt.currency}>
								{index === 0 ? null : <span> • </span>}
								<UserDebtPreview debt={debt} />
							</React.Fragment>
						))}
					</div>
				</Card.Body>
			</Link>
		</Card>
	);
};
