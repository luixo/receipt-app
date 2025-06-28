import type React from "react";
import { View } from "react-native";

import { useQuery } from "@tanstack/react-query";

import {
	DebtsGroup,
	DebtsGroupSkeleton,
} from "~app/components/app/debts-group";
import { LoadableUser } from "~app/components/app/loadable-user";
import { SkeletonUser } from "~app/components/app/user";
import { QueryErrorMessage } from "~app/components/error-message";
import { useShowResolvedDebts } from "~app/hooks/use-show-resolved-debts";
import type { TRPCQueryResult } from "~app/trpc";
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

export const UserDebtsPreviewSkeleton = () => (
	<Card>
		<CardBody className={card()}>
			<SkeletonUser />
			<View className="flex flex-row items-center justify-center gap-2">
				<DebtsGroupSkeleton className="shrink-0" amount={3} />
			</View>
		</CardBody>
	</Card>
);

const UserDebtsGroup: React.FC<{
	query: TRPCQueryResult<"debts.getAllUser">;
}> = ({ query }) => {
	const [showResolvedDebts] = useShowResolvedDebts();
	switch (query.status) {
		case "pending":
			return <DebtsGroupSkeleton className="shrink-0" amount={3} />;
		case "error":
			return <QueryErrorMessage query={query} />;
		case "success": {
			const debts = showResolvedDebts
				? query.data
				: query.data.filter(({ sum }) => sum !== 0);
			return <DebtsGroup className="shrink-0" debts={debts} />;
		}
	}
};

type Props = {
	userId: UsersId;
};

export const UserDebtsPreview: React.FC<Props> = ({ userId }) => {
	const trpc = useTRPC();
	const allUserDebtsQuery = useQuery(
		trpc.debts.getAllUser.queryOptions({ userId }),
	);
	return (
		<CardLink to="/debts/user/$id" params={{ id: userId }}>
			<CardBody
				className={card({
					transparent:
						allUserDebtsQuery.status === "success"
							? allUserDebtsQuery.data.every(({ sum }) => sum === 0)
							: true,
				})}
			>
				<LoadableUser id={userId} />
				<View className="flex flex-row items-center justify-center gap-2">
					<UserDebtsGroup query={allUserDebtsQuery} />
				</View>
			</CardBody>
		</CardLink>
	);
};
