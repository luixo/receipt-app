import React from "react";
import { View } from "react-native";

import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { entries, mapValues } from "remeda";

import { LoadableUser } from "~app/components/app/loadable-user";
import { EmptyCard } from "~app/components/empty-card";
import { QueryErrorMessage } from "~app/components/error-message";
import { PageHeader } from "~app/components/page-header";
import type { TRPCQuerySuccessResult } from "~app/trpc";
import { useTRPC } from "~app/utils/trpc";
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
	const { t } = useTranslation("debts");
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
			<EmptyCard title={t("intentions.empty.title")}>
				{t("intentions.empty.description")}
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
						<InboundDebtIntention key={intention.id} intention={intention} />
					))}
				</View>
			))}
		</>
	);
};

const DebtIntentionsQuery: React.FC = () => {
	const trpc = useTRPC();
	const query = useQuery(trpc.debtIntentions.getAll.queryOptions());
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

export const DebtIntentions: React.FC = () => {
	const { t } = useTranslation("debts");
	return (
		<>
			<PageHeader>{t("intentions.title")}</PageHeader>
			<DebtIntentionsQuery />
		</>
	);
};
