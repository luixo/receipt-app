import type React from "react";
import { View } from "react-native";

import { useSuspenseQuery } from "@tanstack/react-query";

import {
	DebtsGroup,
	DebtsGroupSkeleton,
} from "~app/components/app/debts-group";
import { LoadableUser } from "~app/components/app/loadable-user";
import { SkeletonUser } from "~app/components/app/user";
import { suspendedFallback } from "~app/components/suspense-wrapper";
import { useShowResolvedDebts } from "~app/hooks/use-show-resolved-debts";
import { useTRPC } from "~app/utils/trpc";
import { Card, CardBody } from "~components/card";
import { CardLink } from "~components/link";
import { tv } from "~components/utils";
import type { UsersId } from "~db/models";

const card = tv({
	base: "flex flex-row flex-wrap items-end justify-between gap-4 md:flex-row md:items-center",
	variants: {
		transparent: {
			true: "opacity-50",
		},
	},
});

export const UserDebtsPreviewSkeleton: React.FC<{ userId?: UsersId }> = ({
	userId,
}) => (
	<Card>
		<CardBody className={card({ transparent: Boolean(userId) })}>
			{userId ? <LoadableUser id={userId} /> : <SkeletonUser />}
			<View className="flex flex-row items-center justify-center gap-2">
				<DebtsGroupSkeleton className="shrink-0" amount={3} />
			</View>
		</CardBody>
	</Card>
);

export const UserDebtsPreview = suspendedFallback<{ userId: UsersId }>(
	({ userId }) => {
		const trpc = useTRPC();
		const { data: userDebts } = useSuspenseQuery(
			trpc.debts.getAllUser.queryOptions({ userId }),
		);
		const [showResolvedDebts] = useShowResolvedDebts();
		const debts = showResolvedDebts
			? userDebts
			: userDebts.filter(({ sum }) => sum !== 0);
		return (
			<CardLink to="/debts/user/$id" params={{ id: userId }}>
				<CardBody
					className={card({
						transparent: userDebts.every(({ sum }) => sum === 0),
					})}
				>
					<LoadableUser id={userId} />
					<View className="flex flex-row items-center justify-center gap-2">
						<DebtsGroup className="shrink-0" debts={debts} />
					</View>
				</CardBody>
			</CardLink>
		);
	},
	({ userId }) => <UserDebtsPreviewSkeleton userId={userId} />,
);
