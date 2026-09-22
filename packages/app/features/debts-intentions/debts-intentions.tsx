import React from "react";

import { useSuspenseQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { entries, mapValues } from "remeda";

import { LoadablePeer } from "~app/components/app/loadable-peer";
import { SkeletonPeer } from "~app/components/app/peer";
import { EmptyCard } from "~app/components/empty-card";
import { suspendedFallback } from "~app/components/suspense-wrapper";
import type { TRPCQuerySuccessResult } from "~app/trpc";
import { useTRPC } from "~app/utils/trpc";
import { Button } from "~components/button";
import { View } from "~components/view";
import type { PeerId } from "~db/ids";

import { AcceptAllIntentionsButton } from "./accept-all-intentions-button";
import {
	InboundDebtIntention,
	SkeletonInboundDebtIntention,
} from "./inbound-debt-intention";

type IntentionsQuery = TRPCQuerySuccessResult<"debtIntentions.getAll">;

const AggregatedIntentionGroup: React.FC<{ amount: number }> = ({ amount }) => (
	<View className="gap-4">
		<SkeletonPeer className="self-start" />
		{Array.from({ length: amount }).map((_, index) => (
			// oxlint-disable-next-line react/no-array-index-key
			<SkeletonInboundDebtIntention key={index} />
		))}
	</View>
);

const getLatestIntention = (intentions: IntentionsQuery["data"]["items"]) =>
	intentions.toSorted((intentionA, intentionB) =>
		Temporal.PlainDate.compare(intentionB.timestamp, intentionA.timestamp),
	)[0];

export const DebtIntentions: React.FC = suspendedFallback(
	() => {
		const { t } = useTranslation("debts");
		const trpc = useTRPC();
		const { data: intentions } = useSuspenseQuery(
			trpc.debtIntentions.getAll.queryOptions(),
		);
		const aggregatedIntentions = React.useMemo(() => {
			const intentionsByPeer = intentions.items.reduce<
				Record<PeerId, IntentionsQuery["data"]["items"]>
			>((acc, intention) => {
				const peerIntentions = acc[intention.peerId] || [];
				peerIntentions.push(intention);
				return { ...acc, [intention.peerId]: peerIntentions };
			}, {});
			return entries(
				mapValues(intentionsByPeer, (peerIntentions) =>
					peerIntentions.toSorted((intentionA, intentionB) =>
						Temporal.PlainDate.compare(
							intentionA.timestamp,
							intentionB.timestamp,
						),
					),
				),
			).toSorted(([, groupedIntentionsA], [, groupedIntentionsB]) => {
				const latestA = getLatestIntention(groupedIntentionsA);
				const latestB = getLatestIntention(groupedIntentionsB);
				if (!latestA) {
					return -1;
				}
				if (!latestB) {
					return 1;
				}
				return Temporal.PlainDate.compare(latestA.timestamp, latestB.timestamp);
			});
		}, [intentions]);
		if (intentions.items.length === 0) {
			return <EmptyCard title={t("intentions.empty.title")} />;
		}
		return (
			<View className="flex gap-8">
				{intentions.items.length === 1 ? null : (
					<AcceptAllIntentionsButton
						key={intentions.items.map(({ id }) => id).length}
						intentions={intentions.items}
					/>
				)}
				{aggregatedIntentions.map(([peerId, peerIntentions]) => (
					<View className="gap-4" key={peerId}>
						<LoadablePeer className="self-start" id={peerId} />
						{peerIntentions.map((intention) => (
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
					// oxlint-disable-next-line react/no-array-index-key
					<AggregatedIntentionGroup key={index} amount={index + 2} />
				))}
			</View>
		);
	},
);
