import React from "react";
import { View } from "react-native";

import { useQueries, useQuery } from "@tanstack/react-query";

import { QueryErrorMessage } from "~app/components/error-message";
import { EvenDebtsDivider } from "~app/features/user-debts/even-debts-divider";
import { useDebtsWithDividers } from "~app/hooks/use-debts-with-dividers";
import { useDividers } from "~app/hooks/use-dividers";
import { useShowResolvedDebts } from "~app/hooks/use-show-resolved-debts";
import type { TRPCQueryOutput } from "~app/trpc";
import { useTRPC } from "~app/utils/trpc";
import { DEFAULT_LIMIT } from "~app/utils/validation";
import { Button } from "~components/button";
import { Divider } from "~components/divider";
import type { DebtsId, UsersId } from "~db/models";

import { UserDebtPreview, UserDebtPreviewSkeleton } from "./user-debt-preview";

const DebtsListSkeleton: React.FC<{ amount: number }> = ({ amount }) => (
	<View className="gap-2">
		{new Array<null>(amount).fill(null).map((_, index) => (
			// eslint-disable-next-line react/no-array-index-key
			<React.Fragment key={index}>
				<Divider />
				<UserDebtPreviewSkeleton />
			</React.Fragment>
		))}
	</View>
);

const UserDebtsListInner: React.FC<{
	debtIds: DebtsId[];
	aggregatedDebts: TRPCQueryOutput<"debts.getAllUser">;
}> = ({ debtIds, aggregatedDebts }) => {
	const [showResolvedDebts, setShowResolvedDebts] = useShowResolvedDebts();
	const enableShowResolvedDebts = React.useCallback(
		() => setShowResolvedDebts(true),
		[setShowResolvedDebts],
	);
	const trpc = useTRPC();
	const debtsQueries = useQueries({
		queries: debtIds.map((id) => trpc.debts.get.queryOptions({ id })),
	});
	const successDebtsQueries = debtsQueries.filter(
		(debtQuery) => debtQuery.status === "success",
	);
	const allSuccessQueries = React.useMemo(
		() =>
			successDebtsQueries.length === debtsQueries.length
				? successDebtsQueries.map((successfulQuery) => successfulQuery.data)
				: [],
		[debtsQueries.length, successDebtsQueries],
	);
	const dividers = useDividers(allSuccessQueries, aggregatedDebts);
	const debts = useDebtsWithDividers(debtIds, allSuccessQueries, dividers);
	return (
		<>
			<View className="gap-2">
				{debts.map((debt) => (
					<React.Fragment key={debt.id}>
						{debt.dividerCurrencyCode ? (
							<>
								<Divider />
								<EvenDebtsDivider currencyCode={debt.dividerCurrencyCode} />
							</>
						) : null}
						<Divider />
						<UserDebtPreview debtId={debt.id} />
					</React.Fragment>
				))}
			</View>
			{showResolvedDebts || dividers.length === 0 ? null : (
				<View className="flex items-center">
					<Button
						variant="bordered"
						color="primary"
						onPress={enableShowResolvedDebts}
					>
						Show resolved debts
					</Button>
				</View>
			)}
		</>
	);
};

export const UserDebtsList: React.FC<{
	userId: UsersId;
}> = ({ userId }) => {
	const trpc = useTRPC();
	const getAllQuery = useQuery(trpc.debts.getAllUser.queryOptions({ userId }));
	const idsQuery = useQuery(trpc.debts.getIdsByUser.queryOptions({ userId }));
	switch (getAllQuery.status) {
		case "pending":
			return <DebtsListSkeleton amount={DEFAULT_LIMIT} />;
		case "error":
			return <QueryErrorMessage query={getAllQuery} />;
		case "success": {
			switch (idsQuery.status) {
				case "pending":
					return <DebtsListSkeleton amount={DEFAULT_LIMIT} />;
				case "error":
					return <QueryErrorMessage query={idsQuery} />;
				case "success":
					return (
						<UserDebtsListInner
							aggregatedDebts={getAllQuery.data}
							debtIds={idsQuery.data.map(({ id }) => id)}
						/>
					);
			}
		}
	}
};
