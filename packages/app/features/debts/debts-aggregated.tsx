import type React from "react";
import { View } from "react-native";

import { useQuery } from "@tanstack/react-query";

import {
	DebtsGroup,
	DebtsGroupSkeleton,
} from "~app/components/app/debts-group";
import { QueryErrorMessage } from "~app/components/error-message";
import { ShowResolvedDebtsOption } from "~app/features/settings/show-resolved-debts-option";
import { useShowResolvedDebts } from "~app/hooks/use-show-resolved-debts";
import { useTRPC } from "~app/utils/trpc";

const DebtsAggregatedInner = () => {
	const [showResolvedDebts] = useShowResolvedDebts();
	const trpc = useTRPC();
	const allDebtsQuery = useQuery(trpc.debts.getAll.queryOptions());
	switch (allDebtsQuery.status) {
		case "pending":
			return <DebtsGroupSkeleton amount={3} />;
		case "error":
			return <QueryErrorMessage query={allDebtsQuery} />;
		case "success": {
			const debts = showResolvedDebts
				? allDebtsQuery.data
				: allDebtsQuery.data.filter((debt) => debt.sum !== 0);
			return <DebtsGroup debts={debts} className="px-12" />;
		}
	}
};

export const DebtsAggregated: React.FC = () => (
	<View className="items-center">
		<DebtsAggregatedInner />
		<View className="absolute right-0">
			<ShowResolvedDebtsOption />
		</View>
	</View>
);
