import React from "react";
import { View } from "react-native";

import { useParams, useRouter } from "solito/navigation";

import { DebtsGroup } from "~app/components/app/debts-group";
import { LoadableUser } from "~app/components/app/loadable-user";
import { QueryErrorMessage } from "~app/components/error-message";
import { PageHeader } from "~app/components/page-header";
import { ShowResolvedDebtsOption } from "~app/features/settings/show-resolved-debts-option";
import { useAggregatedDebts } from "~app/hooks/use-aggregated-debts";
import type { TRPCQuerySuccessResult } from "~app/trpc";
import { trpc } from "~app/trpc";
import { Button, Divider, Link, Spinner } from "~components";
import { AddIcon, ExchangeIcon } from "~components/icons";
import type { UsersId } from "~db";
import type { AppPage } from "~utils";
import { useShowResolvedDebts } from "~web/hooks/use-show-resolved-debts";

import { UserDebtPreview } from "./user-debt-preview";

type InnerProps = {
	userId: UsersId;
	query: TRPCQuerySuccessResult<"debts.getUser">;
};

export const UserDebtsInner: React.FC<InnerProps> = ({ userId, query }) => {
	const [showResolvedDebts] = useShowResolvedDebts();
	const [aggregatedDebts, nonZeroAggregateDebts] = useAggregatedDebts(query);
	const router = useRouter();
	React.useEffect(() => {
		if (query.data.length === 0) {
			router.replace("/debts");
		}
	}, [query.data, router]);
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
					debts={showResolvedDebts ? aggregatedDebts : nonZeroAggregateDebts}
				/>
				{nonZeroAggregateDebts.length > 1 ? (
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
				{aggregatedDebts.length !== nonZeroAggregateDebts.length ? (
					<ShowResolvedDebtsOption className="absolute right-0" />
				) : null}
			</View>
			<View className="gap-2">
				{query.data.map((debt) => (
					<React.Fragment key={debt.id}>
						<Divider />
						<UserDebtPreview debt={debt} />
					</React.Fragment>
				))}
			</View>
		</>
	);
};

export const UserDebtsScreen: AppPage = () => {
	const { id: userId } = useParams<{ id: string }>();
	const query = trpc.debts.getUser.useQuery({ userId });
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
