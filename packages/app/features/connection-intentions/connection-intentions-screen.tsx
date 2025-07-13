import type React from "react";
import { View } from "react-native";

import { useSuspenseQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";

import { EmptyCard } from "~app/components/empty-card";
import { PageHeader } from "~app/components/page-header";
import { suspendedFallback } from "~app/components/suspense-wrapper";
import { EmailVerificationCard } from "~app/features/email-verification/email-verification-card";
import { useTRPC } from "~app/utils/trpc";
import { Header } from "~components/header";
import { BackLink } from "~components/link";

import {
	InboundConnectionIntention,
	SkeletonInboundConnectionIntention,
} from "./inbound-connection-intention";
import {
	OutboundConnectionIntention,
	SkeletonOutboundConnectionIntention,
} from "./outbound-connection-intention";

const ConnectionsWrapper: React.FC<
	React.PropsWithChildren<{ type: "inbound" | "outbound" }>
> = ({ type, children }) => {
	const { t } = useTranslation("users");
	return (
		<View className="flex flex-col gap-4">
			<Header>
				{t(
					type === "inbound"
						? "intentions.inboundTitle"
						: "intentions.outboundTitle",
				)}
			</Header>
			<View className="flex flex-col gap-12">{children}</View>
		</View>
	);
};

const ConnectionIntentions: React.FC = suspendedFallback(
	() => {
		const { t } = useTranslation("users");
		const trpc = useTRPC();
		const { data } = useSuspenseQuery(
			trpc.accountConnectionIntentions.getAll.queryOptions(),
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
								key={intention.account.id}
								intention={intention}
							/>
						))}
					</ConnectionsWrapper>
				)}
				{data.outbound.length === 0 ? null : (
					<ConnectionsWrapper type="outbound">
						{data.outbound.map((intention) => (
							<OutboundConnectionIntention
								key={intention.account.id}
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

export const ConnectionIntentionsScreen: React.FC = () => (
	<>
		<EmailVerificationCard />
		<PageHeader startContent={<BackLink to="/users" />}>
			Connection intentions
		</PageHeader>
		<ConnectionIntentions />
	</>
);
