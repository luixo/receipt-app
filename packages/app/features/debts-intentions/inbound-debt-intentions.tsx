import React from "react";

import { Text, Spacer } from "@nextui-org/react";
import { useRouter } from "next/router";

import { LoadableUser } from "app/components/app/loadable-user";
import { useRefs } from "app/hooks/use-refs";
import { TRPCQueryOutput } from "app/trpc";
import { UsersId } from "next-app/db/models";

import { InboundDebtIntention } from "./inbound-debt-intention";

type Intention =
	TRPCQueryOutput<"debtsSyncIntentions.getAll">["inbound"][number];

type Props = {
	intentions: Intention[];
};

export const InboundDebtIntentions: React.FC<Props> = ({ intentions }) => {
	const intentionsRefs = useRefs<HTMLDivElement>();
	const router = useRouter();
	React.useEffect(() => {
		const hash = router.asPath.split("#")[1];
		if (hash) {
			const matchedIntention = intentions.find(
				(intention) => intention.id === hash,
			);
			if (matchedIntention && intentionsRefs.current[hash]) {
				intentionsRefs.current[hash]?.scrollIntoView();
			}
		}
	}, [intentions, router.asPath, intentionsRefs]);
	const intentionsByUser = intentions.reduce<Record<UsersId, Intention[]>>(
		(acc, intention) => {
			if (!acc[intention.userId]) {
				acc[intention.userId] = [];
			}
			acc[intention.userId]!.push(intention);
			return acc;
		},
		{},
	);
	return (
		<>
			<Text h2>Inbound debts</Text>
			<Spacer y={0.5} />
			{Object.entries(intentionsByUser).map(
				([userId, groupedIntentions], index) => (
					<React.Fragment key={userId}>
						{index === 0 ? null : <Spacer y={1.5} />}
						<LoadableUser id={userId} />
						{groupedIntentions.map((intention) => (
							<React.Fragment key={intention.id}>
								<Spacer y={1} />
								<InboundDebtIntention
									intention={intention}
									ref={intentionsRefs.setRef(intention.id)}
								/>
							</React.Fragment>
						))}
					</React.Fragment>
				),
			)}
		</>
	);
};
