import React from "react";
import { View } from "react-native";

import { usePathname } from "solito/navigation";

import { LoadableUser } from "~app/components/app/loadable-user";
import { EmptyCard } from "~app/components/empty-card";
import { QueryErrorMessage } from "~app/components/error-message";
import { PageHeader } from "~app/components/page-header";
import { useRefs } from "~app/hooks/use-refs";
import type { TRPCQuerySuccessResult } from "~app/trpc";
import { trpc } from "~app/trpc";
import { Spinner } from "~components";
import type { UsersId } from "~db";

import { AcceptAllIntentionsButton } from "./accept-all-intentions-button";
import { InboundDebtIntention } from "./inbound-debt-intention";

type IntentionsQuery = TRPCQuerySuccessResult<"debts.getIntentions">;

type Props = {
	query: IntentionsQuery;
};

const DebtIntentionsInner: React.FC<Props> = ({ query: { data } }) => {
	const intentionsRefs = useRefs<HTMLDivElement>();
	const pathname = usePathname() || "";
	React.useEffect(() => {
		const hash = pathname.split("#")[1];
		if (hash) {
			const matchedIntention = data.find((intention) => intention.id === hash);
			if (matchedIntention && intentionsRefs.current[hash]) {
				intentionsRefs.current[hash]?.scrollIntoView();
			}
		}
	}, [data, pathname, intentionsRefs]);
	if (data.length === 0) {
		return (
			<EmptyCard title="You have no incoming sync requests">
				Ask a friend to create a debt for you ;)
			</EmptyCard>
		);
	}
	const intentionsByUser = data.reduce<
		Record<UsersId, IntentionsQuery["data"]>
	>((acc, intention) => {
		const intentions = acc[intention.userId] || [];
		intentions.push(intention);
		acc[intention.userId] = intentions;
		return acc;
	}, {});
	return (
		<>
			<PageHeader>Inbound debts</PageHeader>
			{data.length === 1 ? null : (
				<AcceptAllIntentionsButton intentions={data} />
			)}
			{Object.entries(intentionsByUser).map(([userId, groupedIntentions]) => (
				<View className="gap-2" key={userId}>
					<LoadableUser className="mb-4 self-start" id={userId} />
					{groupedIntentions.map((intention) => (
						<InboundDebtIntention
							key={intention.id}
							intention={intention}
							ref={intentionsRefs.setRef(intention.id)}
						/>
					))}
				</View>
			))}
		</>
	);
};

export const DebtIntentions: React.FC = () => {
	const query = trpc.debts.getIntentions.useQuery();
	if (query.status === "pending") {
		return <Spinner size="lg" />;
	}
	if (query.status === "error") {
		return <QueryErrorMessage query={query} />;
	}
	return <DebtIntentionsInner query={query} />;
};
