import React from "react";
import { View } from "react-native";

import { entries, mapValues } from "remeda";
import { usePathname } from "solito/navigation";

import { LoadableUser } from "~app/components/app/loadable-user";
import { EmptyCard } from "~app/components/empty-card";
import { QueryErrorMessage } from "~app/components/error-message";
import { PageHeader } from "~app/components/page-header";
import { useRefs } from "~app/hooks/use-refs";
import type { TRPCQuerySuccessResult } from "~app/trpc";
import { trpc } from "~app/trpc";
import { Spinner } from "~components/spinner";
import type { UsersId } from "~db/models";

import { AcceptAllIntentionsButton } from "./accept-all-intentions-button";
import { InboundDebtIntention } from "./inbound-debt-intention";

type IntentionsQuery = TRPCQuerySuccessResult<"debtIntentions.getAll">;

const getLatestIntention = (intentions: IntentionsQuery["data"]) =>
	intentions.reduce(
		(acc, intention) => Math.max(acc, intention.timestamp.valueOf()),
		-1,
	);

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
				intentionsRefs.current[hash].scrollIntoView();
			}
		}
	}, [data, pathname, intentionsRefs]);
	const sortedIntentionsByUser = React.useMemo(() => {
		const intentionsByUser = data.reduce<
			Record<UsersId, IntentionsQuery["data"]>
		>((acc, intention) => {
			const intentions = acc[intention.userId] || [];
			intentions.push(intention);
			acc[intention.userId] = intentions;
			return acc;
		}, {});
		return entries(
			mapValues(intentionsByUser, (intentions) =>
				intentions.sort(
					(intentionA, intentionB) =>
						intentionA.timestamp.valueOf() - intentionB.timestamp.valueOf(),
				),
			),
		).sort(
			([, groupedIntentionsA], [, groupedIntentionsB]) =>
				getLatestIntention(groupedIntentionsA) -
				getLatestIntention(groupedIntentionsB),
		);
	}, [data]);
	if (data.length === 0) {
		return (
			<EmptyCard title="You have no incoming sync requests">
				You have no incoming sync requests
			</EmptyCard>
		);
	}
	return (
		<>
			{data.length === 1 ? null : (
				<AcceptAllIntentionsButton
					key={data.map(({ id }) => id).length}
					intentions={data}
				/>
			)}
			{sortedIntentionsByUser.map(([userId, userIntentions]) => (
				<View className="gap-2" key={userId}>
					<LoadableUser className="mb-4 self-start" id={userId} />
					{userIntentions.map((intention) => (
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

const DebtIntentionsQuery: React.FC = () => {
	const query = trpc.debtIntentions.getAll.useQuery();
	switch (query.status) {
		case "error":
			return <QueryErrorMessage query={query} />;
		case "pending":
			return (
				<>
					<AcceptAllIntentionsButton intentions={[]} isDisabled />
					<Spinner size="lg" />
				</>
			);
		case "success":
			return <DebtIntentionsInner query={query} />;
	}
};

export const DebtIntentions: React.FC = () => (
	<>
		<PageHeader>Inbound debts</PageHeader>
		<DebtIntentionsQuery />
	</>
);
