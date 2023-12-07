import React from "react";
import { View } from "react-native";

import { Spacer, Spinner } from "@nextui-org/react-tailwind";
import { useRouter } from "next/router";

import { LoadableUser } from "app/components/app/loadable-user";
import { Text } from "app/components/base/text";
import { QueryErrorMessage } from "app/components/error-message";
import { useRefs } from "app/hooks/use-refs";
import type { TRPCQuerySuccessResult } from "app/trpc";
import { trpc } from "app/trpc";
import type { UsersId } from "next-app/db/models";

import { AcceptAllIntentionsButton } from "./accept-all-intentions-button";
import { InboundDebtIntention } from "./inbound-debt-intention";

type IntentionsQuery = TRPCQuerySuccessResult<"debts.getIntentions">;

type Props = {
	query: IntentionsQuery;
};

const DebtIntentionsInner: React.FC<Props> = ({ query: { data } }) => {
	const intentionsRefs = useRefs<HTMLDivElement>();
	const router = useRouter();
	React.useEffect(() => {
		const hash = router.asPath.split("#")[1];
		if (hash) {
			const matchedIntention = data.find((intention) => intention.id === hash);
			if (matchedIntention && intentionsRefs.current[hash]) {
				intentionsRefs.current[hash]?.scrollIntoView();
			}
		}
	}, [data, router.asPath, intentionsRefs]);
	if (data.length === 0) {
		return (
			<View className="m-10 self-center md:max-w-lg">
				<Text className="text-center text-4xl font-medium">
					You have no incoming sync requests
				</Text>
				<Spacer y={4} />
				<Text className="text-center text-2xl">
					Ask a friend to create a debt for you ;)
				</Text>
			</View>
		);
	}
	const intentionsByUser = data.reduce<
		Record<UsersId, IntentionsQuery["data"]>
	>((acc, intention) => {
		if (!acc[intention.userId]) {
			acc[intention.userId] = [];
		}
		acc[intention.userId]!.push(intention);
		return acc;
	}, {});
	return (
		<>
			<Text className="text-center text-4xl font-medium">Inbound debts</Text>
			{data.length === 1 ? null : (
				<>
					<Spacer y={4} />
					<AcceptAllIntentionsButton intentions={data} />
				</>
			)}
			{Object.entries(intentionsByUser).map(([userId, groupedIntentions]) => (
				<React.Fragment key={userId}>
					<Spacer y={4} />
					<LoadableUser id={userId} />
					{groupedIntentions.map((intention) => (
						<React.Fragment key={intention.id}>
							<Spacer y={4} />
							<InboundDebtIntention
								intention={intention}
								ref={intentionsRefs.setRef(intention.id)}
							/>
						</React.Fragment>
					))}
				</React.Fragment>
			))}
		</>
	);
};

export const DebtIntentions: React.FC = () => {
	const query = trpc.debts.getIntentions.useQuery();
	if (query.status === "loading") {
		return <Spinner size="lg" />;
	}
	if (query.status === "error") {
		return <QueryErrorMessage query={query} />;
	}
	return <DebtIntentionsInner query={query} />;
};
