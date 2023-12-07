import React from "react";
import { View } from "react-native";

import { Button, Link, Spacer, Spinner } from "@nextui-org/react-tailwind";
import { MdAdd as AddIcon } from "react-icons/md";

import { DebtsGroup } from "app/components/app/debts-group";
import { Text } from "app/components/base/text";
import { QueryErrorMessage } from "app/components/error-message";
import { ShowResolvedDebtsOption } from "app/features/settings/show-resolved-debts-option";
import { useAggregatedAllDebts } from "app/hooks/use-aggregated-all-debts";
import type { TRPCQuerySuccessResult } from "app/trpc";
import { trpc } from "app/trpc";
import { useShowResolvedDebts } from "next-app/hooks/use-show-resolved-debts";

import { UserDebtsPreview } from "./user-debts-preview";

type InnerProps = {
	query: TRPCQuerySuccessResult<"debts.getByUsers">;
};

const DebtsInner: React.FC<InnerProps> = ({ query }) => {
	const [showResolvedDebts] = useShowResolvedDebts();
	const [sums, nonZeroSums] = useAggregatedAllDebts(query.data);

	if (showResolvedDebts ? sums.length === 0 : nonZeroSums.length === 0) {
		return (
			<View className="m-10 self-center md:max-w-lg">
				<Text className="text-4xl font-medium">You have no debts</Text>
				<Spacer y={4} />
				<Text className="text-center text-2xl font-medium">
					Press
					<Button
						href="/debts/add"
						as={Link}
						color="primary"
						title="Add debt"
						variant="bordered"
						isIconOnly
						className="mx-2"
					>
						<AddIcon size={24} />
					</Button>
					to add a debt
				</Text>
				{sums.length !== nonZeroSums.length ? (
					<>
						<Spacer y={4} />
						<ShowResolvedDebtsOption />
					</>
				) : null}
			</View>
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
			<Spacer y={4} />
			{query.data.map(({ userId, debts }, index) => {
				const allDebtsResolved = debts.every((debt) => debt.sum === 0);
				if (allDebtsResolved && !showResolvedDebts) {
					return null;
				}
				return (
					<React.Fragment key={userId}>
						{index === 0 ? null : <Spacer y={2} />}
						<UserDebtsPreview
							debts={debts.filter((debt) =>
								showResolvedDebts ? true : debt.sum !== 0,
							)}
							userId={userId}
							transparent={allDebtsResolved}
						/>
					</React.Fragment>
				);
			})}
		</>
	);
};

export const Debts: React.FC = () => {
	const query = trpc.debts.getByUsers.useQuery();
	if (query.status === "loading") {
		return <Spinner size="lg" />;
	}
	if (query.status === "error") {
		return <QueryErrorMessage query={query} />;
	}
	return <DebtsInner query={query} />;
};
