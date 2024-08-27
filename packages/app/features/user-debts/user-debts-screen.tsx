import React from "react";
import { View } from "react-native";

import { useParams } from "solito/navigation";

import { DebtsGroup } from "~app/components/app/debts-group";
import { LoadableUser } from "~app/components/app/loadable-user";
import { QueryErrorMessage } from "~app/components/error-message";
import { PageHeader } from "~app/components/page-header";
import { ShowResolvedDebtsOption } from "~app/features/settings/show-resolved-debts-option";
import { useAggregatedDebts } from "~app/hooks/use-aggregated-debts";
import { useShowResolvedDebts } from "~app/hooks/use-show-resolved-debts";
import type { TRPCQuerySuccessResult } from "~app/trpc";
import { trpc } from "~app/trpc";
import { Button } from "~components/button";
import { Divider } from "~components/divider";
import { AddIcon, ExchangeIcon } from "~components/icons";
import { Link } from "~components/link";
import { Spinner } from "~components/spinner";
import type { UsersId } from "~db/models";
import type { AppPage } from "~utils/next";

import { UserDebtPreview } from "./user-debt-preview";

type InnerProps = {
	userId: UsersId;
	query: TRPCQuerySuccessResult<"debts.getIdsByUser">;
};

export const UserDebtsInner: React.FC<InnerProps> = ({ userId, query }) => {
	const [showResolvedDebts] = useShowResolvedDebts();
	const [
		aggregatedDebts,
		nonZeroAggregatedDebts,
		aggregatedDebtsLoading,
		aggregatedDebtsErrorQueries,
	] = useAggregatedDebts(query);
	const userQuery = trpc.users.get.useQuery({ id: userId });
	return (
		<>
			<PageHeader
				backHref="/debts"
				title={`${
					userQuery.status === "success" ? userQuery.data.name : "..."
				}'s debts`}
				aside={
					<Button
						color="primary"
						href={`/debts/add?userId=${userId}`}
						as={Link}
						title="Add debt"
						variant="bordered"
						isIconOnly
					>
						<AddIcon size={24} />
					</Button>
				}
			>
				<LoadableUser id={userId} />
			</PageHeader>
			<View className="flex-row items-center justify-center gap-4 px-16">
				<DebtsGroup
					isLoading={aggregatedDebtsLoading}
					errorQueries={aggregatedDebtsErrorQueries}
					debts={showResolvedDebts ? aggregatedDebts : nonZeroAggregatedDebts}
				/>
				{nonZeroAggregatedDebts.length > 1 ? (
					<Button
						color="primary"
						href={`/debts/user/${userId}/exchange/`}
						as={Link}
						variant="bordered"
						isIconOnly
					>
						<ExchangeIcon />
					</Button>
				) : null}
				{aggregatedDebts.length !== nonZeroAggregatedDebts.length ? (
					<ShowResolvedDebtsOption className="absolute right-0" />
				) : null}
			</View>
			<View className="gap-2">
				{query.data.map((debt) => (
					<React.Fragment key={debt.id}>
						<Divider />
						<UserDebtPreview debtId={debt.id} />
					</React.Fragment>
				))}
			</View>
		</>
	);
};

export const UserDebtsScreen: AppPage = () => {
	const { id: userId } = useParams<{ id: string }>();
	const query = trpc.debts.getIdsByUser.useQuery({ userId });
	if (query.status === "pending") {
		return (
			<>
				<PageHeader>
					<LoadableUser id={userId} />
				</PageHeader>
				<Spinner />
			</>
		);
	}
	if (query.status === "error") {
		return <QueryErrorMessage query={query} />;
	}
	return <UserDebtsInner query={query} userId={userId} />;
};
