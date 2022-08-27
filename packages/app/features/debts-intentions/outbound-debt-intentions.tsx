import React from "react";

import { Text, Spacer } from "@nextui-org/react";

import { LoadableUser } from "app/components/app/loadable-user";
import { TRPCQueryOutput } from "app/trpc";
import { UsersId } from "next-app/db/models";

import { OutboundDebtIntention } from "./outbound-debt-intention";

type Intention =
	TRPCQueryOutput<"debts-sync-intentions.get-all">["outbound"][number];

type Props = {
	intentions: Intention[];
};

export const OutboundDebtIntentions: React.FC<Props> = ({ intentions }) => {
	const intentionsByUser = intentions.reduce<Record<UsersId, Intention[]>>(
		(acc, intention) => {
			if (!acc[intention.userId]) {
				acc[intention.userId] = [];
			}
			acc[intention.userId]!.push(intention);
			return acc;
		},
		{}
	);
	return (
		<>
			<Text h2>Outbound debts</Text>
			<Spacer y={0.5} />
			{Object.entries(intentionsByUser).map(
				([userId, groupedIntentions], index) => (
					<React.Fragment key={userId}>
						{index === 0 ? null : <Spacer y={1.5} />}
						<LoadableUser id={userId} />
						{groupedIntentions.map((intention) => (
							<React.Fragment key={intention.id}>
								<Spacer y={1} />
								<OutboundDebtIntention intention={intention} />
							</React.Fragment>
						))}
					</React.Fragment>
				)
			)}
		</>
	);
};
