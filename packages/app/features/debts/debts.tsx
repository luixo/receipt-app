import type React from "react";
import { View } from "react-native";

import {
	DebtsGroup,
	DebtsGroupSkeleton,
} from "~app/components/app/debts-group";
import { EmptyCard } from "~app/components/empty-card";
import { QueryErrorMessage } from "~app/components/error-message";
import { ShowResolvedDebtsOption } from "~app/features/settings/show-resolved-debts-option";
import { useAggregatedAllDebts } from "~app/hooks/use-aggregated-all-debts";
import { useShowResolvedDebts } from "~app/hooks/use-show-resolved-debts";
import type { TRPCQuerySuccessResult } from "~app/trpc";
import { trpc } from "~app/trpc";
import { Button } from "~components/button";
import { AddIcon } from "~components/icons";
import { Link } from "~components/link";

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
						<Button
							to="/debts/add"
							as={Link<"/debts/add">}
							color="primary"
							title="Add debt"
							variant="bordered"
							isIconOnly
							className="mx-2"
						>
							<AddIcon size={24} />
						</Button>
						to add a debt
					</View>
					{sums.length !== nonZeroSums.length ? (
						<ShowResolvedDebtsOption />
					) : null}
				</View>
			</EmptyCard>
		);
	}

	return (
		<>
			<View className="items-center">
				<DebtsGroup
					debts={showResolvedDebts ? sums : nonZeroSums}
					className="px-12"
				/>
				{sums.length !== nonZeroSums.length ? (
					<View className="absolute right-0">
						<ShowResolvedDebtsOption />
					</View>
				) : null}
			</View>
			<View className="mt-4 gap-2">
				{query.data.map(({ userId, debts, unsyncedDebtsAmount }) => {
					const allDebtsResolved = debts.every((debt) => debt.sum === 0);
					if (
						allDebtsResolved &&
						!showResolvedDebts &&
						unsyncedDebtsAmount === 0
					) {
						return null;
					}
					return (
						<UserDebtsPreview
							key={userId}
							debts={debts.filter((debt) =>
								showResolvedDebts ? true : debt.sum !== 0,
							)}
							unsyncedDebtsAmount={unsyncedDebtsAmount}
							userId={userId}
							transparent={allDebtsResolved}
						/>
					);
				})}
			</View>
		</>
	);
};

const skeletonElements = new Array<null>(5).fill(null).map((_, index) => index);

export const Debts: React.FC = () => {
	const query = trpc.debts.getByUsers.useQuery();
	if (query.status === "pending") {
		return (
			<>
				<View className="items-center">
					<DebtsGroupSkeleton amount={3} />
				</View>
				<View className="mt-4 gap-2">
					{skeletonElements.map((index) => (
						<UserDebtsPreviewSkeleton key={index} />
					))}
				</View>
			</>
		);
	}
	if (query.status === "error") {
		return <QueryErrorMessage query={query} />;
	}
	return <DebtsInner query={query} />;
};
