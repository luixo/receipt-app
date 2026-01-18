import type React from "react";

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
import { cn } from "~components/utils";
import { View } from "~components/view";
import type { UserId } from "~db/ids";

const baseClassName =
	"flex flex-row flex-wrap items-end justify-between gap-4 md:flex-row md:items-center";

export const UserDebtsPreviewSkeleton: React.FC<{ userId?: UserId }> = ({
	userId,
}) => (
	<Card>
		<CardBody className={cn(baseClassName, userId ? "opacity-50" : undefined)}>
			{userId ? <LoadableUser id={userId} /> : <SkeletonUser />}
			<View className="flex flex-row items-center justify-center gap-2">
				<DebtsGroupSkeleton className="shrink-0" amount={3} />
			</View>
		</CardBody>
	</Card>
);

export const UserDebtsPreview = suspendedFallback<{ userId: UserId }>(
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
					className={cn(
						baseClassName,
						userDebts.every(({ sum }) => sum === 0) ? "opacity-50" : undefined,
					)}
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
