import React from "react";
import { View } from "react-native";

import { useSuspenseQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { entries, mapValues } from "remeda";

import { LoadableUser } from "~app/components/app/loadable-user";
import { SkeletonUser } from "~app/components/app/user";
import { EmptyCard } from "~app/components/empty-card";
import { suspendedFallback } from "~app/components/suspense-wrapper";
import type { TRPCQuerySuccessResult } from "~app/trpc";
import { useTRPC } from "~app/utils/trpc";
import { Button } from "~components/button";
import type { UserId } from "~db/ids";
import { compare } from "~utils/date";

import { AcceptAllIntentionsButton } from "./accept-all-intentions-button";
import {
	InboundDebtIntention,
	SkeletonInboundDebtIntention,
} from "./inbound-debt-intention";

type IntentionsQuery = TRPCQuerySuccessResult<"debtIntentions.getAll">;

const AggregatedIntentionGroup: React.FC<{ amount: number }> = ({ amount }) => (
	<View className="gap-4">
		<SkeletonUser className="self-start" />
		{Array.from({ length: amount }).map((_, index) => (
			// eslint-disable-next-line react/no-array-index-key
			<SkeletonInboundDebtIntention key={index} />
		))}
	</View>
);

const getLatestIntention = (intentions: IntentionsQuery["data"]) =>
	intentions.toSorted((intentionA, intentionB) =>
		compare.plainDate(intentionB.timestamp, intentionA.timestamp),
	)[0];

export const DebtIntentions: React.FC = suspendedFallback(
	() => {
		const { t } = useTranslation("debts");
		const trpc = useTRPC();
		const { data: intentions } = useSuspenseQuery(
			trpc.debtIntentions.getAll.queryOptions(),
		);
		const aggregatedIntentions = React.useMemo(() => {
			const intentionsByUser = intentions.reduce<
				Record<UserId, IntentionsQuery["data"]>
			>((acc, intention) => {
				const userIntentions = acc[intention.userId] || [];
				userIntentions.push(intention);
				acc[intention.userId] = userIntentions;
				return acc;
			}, {});
			return entries(
				mapValues(intentionsByUser, (userIntentions) =>
					userIntentions.sort((intentionA, intentionB) =>
						compare.plainDate(intentionA.timestamp, intentionB.timestamp),
					),
				),
			).sort(([, groupedIntentionsA], [, groupedIntentionsB]) => {
				const latestA = getLatestIntention(groupedIntentionsA);
				const latestB = getLatestIntention(groupedIntentionsB);
				if (!latestA) {
					return -1;
				}
				if (!latestB) {
					return 1;
				}
				return compare.plainDate(latestA.timestamp, latestB.timestamp);
			});
		}, [intentions]);
		if (intentions.length === 0) {
			return (
				<EmptyCard title={t("intentions.empty.title")}>
					{t("intentions.empty.description")}
				</EmptyCard>
			);
		}
		return (
			<View className="flex gap-8">
				{intentions.length === 1 ? null : (
					<AcceptAllIntentionsButton
						key={intentions.map(({ id }) => id).length}
						intentions={intentions}
					/>
				)}
				{aggregatedIntentions.map(([userId, userIntentions]) => (
					<View className="gap-4" key={userId}>
						<LoadableUser className="self-start" id={userId} />
						{userIntentions.map((intention) => (
							<InboundDebtIntention key={intention.id} intention={intention} />
						))}
					</View>
				))}
			</View>
		);
	},
	() => {
		const { t } = useTranslation("debts");
		return (
			<View className="flex gap-8">
				<Button color="primary">{t("intentions.acceptAllButton")}</Button>
				{Array.from({ length: 2 }).map((_, index) => (
					// eslint-disable-next-line react/no-array-index-key
					<AggregatedIntentionGroup key={index} amount={index + 2} />
				))}
			</View>
		);
	},
);
