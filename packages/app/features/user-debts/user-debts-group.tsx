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
import type { TRPCQueryOutput } from "~app/trpc";
import { useTRPC } from "~app/utils/trpc";
import { ExchangeIcon } from "~components/icons";
import { ButtonLink } from "~components/link";
import type { UsersId } from "~db/models";

const UserDebtsGroupInner: React.FC<{
	userId: UsersId;
	debts: TRPCQueryOutput<"debts.getAllUser">;
}> = ({ userId, debts }) => {
	const [showResolvedDebts] = useShowResolvedDebts();
	const nonResolvedDebts = debts.filter((element) => element.sum !== 0);
	return (
		<View className="flex-row items-center justify-center gap-4 px-16">
			<DebtsGroup debts={showResolvedDebts ? debts : nonResolvedDebts} />
			{nonResolvedDebts.length > 1 ? (
				<ButtonLink
					color="primary"
					to="/debts/user/$id/exchange"
					params={{ id: userId }}
					variant="bordered"
					isIconOnly
				>
					<ExchangeIcon />
				</ButtonLink>
			) : null}
			{debts.length !== nonResolvedDebts.length ? (
				<ShowResolvedDebtsOption className="absolute right-0" />
			) : null}
		</View>
	);
};

export const UserDebtsGroup: React.FC<{ userId: UsersId }> = ({ userId }) => {
	const trpc = useTRPC();
	const query = useQuery(trpc.debts.getAllUser.queryOptions({ userId }));
	switch (query.status) {
		case "pending":
			return (
				<View className="flex-row items-center justify-center">
					<DebtsGroupSkeleton amount={3} />
				</View>
			);
		case "error":
			return <QueryErrorMessage query={query} />;
		case "success":
			return <UserDebtsGroupInner userId={userId} debts={query.data} />;
	}
};
