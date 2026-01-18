import type React from "react";

import { useSuspenseQuery } from "@tanstack/react-query";

import {
	DebtsGroup,
	DebtsGroupSkeleton,
} from "~app/components/app/debts-group";
import { suspendedFallback } from "~app/components/suspense-wrapper";
import { ShowResolvedDebtsOption } from "~app/features/settings/show-resolved-debts-option";
import { useShowResolvedDebts } from "~app/hooks/use-show-resolved-debts";
import { useTRPC } from "~app/utils/trpc";
import { View } from "~components/view";

const DebtsAggregatedInner = suspendedFallback(
	() => {
		const [showResolvedDebts] = useShowResolvedDebts();
		const trpc = useTRPC();
		const { data: allDebts } = useSuspenseQuery(
			trpc.debts.getAll.queryOptions(),
		);
		const debts = showResolvedDebts
			? allDebts
			: allDebts.filter((debt) => debt.sum !== 0);
		return <DebtsGroup debts={debts} className="px-12" />;
	},
	<DebtsGroupSkeleton amount={3} />,
);

export const DebtsAggregated: React.FC = () => (
	<View className="items-center">
		<DebtsAggregatedInner />
		<View className="absolute right-0">
			<ShowResolvedDebtsOption />
		</View>
	</View>
);
