import type React from "react";
import { View } from "react-native";

import { useQuery } from "@tanstack/react-query";

import { EmptyCard } from "~app/components/empty-card";
import { QueryErrorMessage } from "~app/components/error-message";
import { useAggregatedAllDebts } from "~app/hooks/use-aggregated-all-debts";
import { useShowResolvedDebts } from "~app/hooks/use-show-resolved-debts";
import type { TRPCQuerySuccessResult } from "~app/trpc";
import { useTRPC } from "~app/utils/trpc";
import { AddIcon } from "~components/icons";
import { ButtonLink } from "~components/link";

import {
	UserDebtsPreview,
	UserDebtsPreviewSkeleton,
} from "./user-debts-preview";

type InnerProps = {
	query: TRPCQuerySuccessResult<"debts.getByUsers">;
};

const DebtsInner: React.FC<InnerProps> = ({ query }) => {
	const [showResolvedDebts] = useShowResolvedDebts();
	const [sums, nonZeroSums] = useAggregatedAllDebts(query.data);

	if (showResolvedDebts ? sums.length === 0 : nonZeroSums.length === 0) {
		return (
			<EmptyCard title="You have no debts">
				<View className="items-center gap-4">
					<View className="flex-row">
						Press
						<ButtonLink
							to="/debts/add"
							color="primary"
							title="Add debt"
							variant="bordered"
							isIconOnly
							className="mx-2"
						>
							<AddIcon size={24} />
						</ButtonLink>
						to add a debt
					</View>
				</View>
			</EmptyCard>
		);
	}

	return (
		<View className="gap-2">
			{query.data.map(({ userId, debts }) => {
				const allDebtsResolved = debts.every((debt) => debt.sum === 0);
				if (allDebtsResolved && !showResolvedDebts) {
					return null;
				}
				return (
					<UserDebtsPreview
						key={userId}
						debts={debts.filter((debt) =>
							showResolvedDebts ? true : debt.sum !== 0,
						)}
						userId={userId}
						transparent={debts.every((debt) => debt.sum === 0)}
					/>
				);
			})}
		</View>
	);
};

const skeletonElements = new Array<null>(5).fill(null).map((_, index) => index);

export const Debts: React.FC = () => {
	const trpc = useTRPC();
	const query = useQuery(trpc.debts.getByUsers.queryOptions());
	if (query.status === "pending") {
		return (
			<View className="gap-2">
				{skeletonElements.map((index) => (
					<UserDebtsPreviewSkeleton key={index} />
				))}
			</View>
		);
	}
	if (query.status === "error") {
		return <QueryErrorMessage query={query} />;
	}
	return <DebtsInner query={query} />;
};
