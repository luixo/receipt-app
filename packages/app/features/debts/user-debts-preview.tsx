import React from "react";

import { Spacer, Card } from "@nextui-org/react";

import { User } from "app/components/app/user";
import { TRPCQueryOutput } from "app/trpc";
import { UsersId } from "next-app/db/models";

import { UserDebtPreview } from "./user-debt-preview";

type Props = {
	debts: TRPCQueryOutput<"debts.get-by-users">[UsersId]["debts"];
	user: TRPCQueryOutput<"debts.get-by-users">[UsersId]["user"];
};

export const UserDebtsPreview: React.FC<Props> = ({ debts, user }) => (
	<Card>
		<Card.Body>
			<User user={user} />
			<Spacer y={1} />
			<div>
				{debts.map((debt, index) => (
					<>
						{index === 0 ? null : <span> • </span>}
						<UserDebtPreview key={debt.currency} debt={debt} />
					</>
				))}
			</div>
		</Card.Body>
	</Card>
);
