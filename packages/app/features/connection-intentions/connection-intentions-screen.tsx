import type React from "react";

import { useSuspenseQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";

import { EmptyCard } from "#app/components/empty-card.tsx";
import { PageHeader } from "#app/components/page-header.tsx";
import { suspendedFallback } from "#app/components/suspense-wrapper.tsx";
import { EmailVerificationCard } from "#app/features/email-verification/email-verification-card.tsx";
import { useTRPC } from "#app/utils/trpc.ts";
import { BackLink } from "#components/back-link.tsx";
import { Text } from "#components/text.tsx";
import type { ViewReactNode } from "#components/view.tsx";
import { View } from "#components/view.tsx";

import {
	InboundConnectionIntention,
	SkeletonInboundConnectionIntention,
} from "./inbound-connection-intention";
import {
	OutboundConnectionIntention,
	SkeletonOutboundConnectionIntention,
} from "./outbound-connection-intention";

const ConnectionsWrapper: React.FC<{
	type: "inbound" | "outbound";
	children: ViewReactNode;
}> = ({ type, children }) => {
	const { t } = useTranslation("peers");
	return (
		<View className="flex flex-col gap-4">
			<Text variant="h3">
				{t(
					type === "inbound"
						? "intentions.inboundTitle"
						: "intentions.outboundTitle",
				)}
			</Text>
			<View className="flex flex-col gap-12">{children}</View>
		</View>
	);
};

const ConnectionIntentions: React.FC = suspendedFallback(
	() => {
		const { t } = useTranslation("peers");
		const trpc = useTRPC();
		const { data } = useSuspenseQuery(
			trpc.userConnectionIntentions.getAll.queryOptions(),
		);
		if (data.inbound.length === 0 && data.outbound.length === 0) {
			return <EmptyCard title={t("intentions.emptyTitle")} />;
		}
		return (
			<View className="flex flex-col gap-12">
				{data.inbound.length === 0 ? null : (
					<ConnectionsWrapper type="inbound">
						{data.inbound.map((intention) => (
							<InboundConnectionIntention
								key={intention.user.id}
								intention={intention}
							/>
						))}
					</ConnectionsWrapper>
				)}
				{data.outbound.length === 0 ? null : (
					<ConnectionsWrapper type="outbound">
						{data.outbound.map((intention) => (
							<OutboundConnectionIntention
								key={intention.user.id}
								intention={intention}
							/>
						))}
					</ConnectionsWrapper>
				)}
			</View>
		);
	},
	<View className="flex flex-col gap-12">
		<ConnectionsWrapper type="inbound">
			<SkeletonInboundConnectionIntention />
		</ConnectionsWrapper>
		<ConnectionsWrapper type="outbound">
			<SkeletonOutboundConnectionIntention />
		</ConnectionsWrapper>
	</View>,
);

export const ConnectionIntentionsScreen = () => {
	const { t } = useTranslation("peers");
	return (
		<>
			<EmailVerificationCard />
			<PageHeader startContent={<BackLink to="/peers" />}>
				{t("intentions.header")}
			</PageHeader>
			<ConnectionIntentions />
		</>
	);
};
