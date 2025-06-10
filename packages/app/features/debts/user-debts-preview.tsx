import type React from "react";
import { View } from "react-native";

import { useQuery } from "@tanstack/react-query";

import {
	DebtsGroup,
	DebtsGroupSkeleton,
} from "~app/components/app/debts-group";
import { LoadableUser } from "~app/components/app/loadable-user";
import { SkeletonUser } from "~app/components/app/user";
import type { TRPCQueryOutput } from "~app/trpc";
import { useTRPC } from "~app/utils/trpc";
import { Card, CardBody } from "~components/card";
import { SyncIcon, UnsyncIcon } from "~components/icons";
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

type Props = {
	debts: TRPCQueryOutput<"debts.getByUsers">[number]["debts"];
	userId: UsersId;
	transparent: boolean;
	unsyncedDebtsAmount: number;
};

export const UserDebtsPreview: React.FC<Props> = ({
	debts,
	userId,
	transparent,
	unsyncedDebtsAmount,
}) => {
	const trpc = useTRPC();
	const userQuery = useQuery(trpc.users.get.queryOptions({ id: userId }));
	const accountSettingsQuery = useQuery(
		trpc.accountSettings.get.queryOptions(),
	);
	return (
		<CardLink to="/debts/user/$id" params={{ id: userId }}>
			<CardBody className={card({ transparent })}>
				<LoadableUser id={userId} />
				<View className="flex flex-row items-center justify-center gap-2">
					{userQuery.status === "success" &&
					userQuery.data.connectedAccount &&
					accountSettingsQuery.status === "success" ? (
						unsyncedDebtsAmount === 0 ? (
							accountSettingsQuery.data.manualAcceptDebts ? (
								<SyncIcon size={24} className="text-success" />
							) : null
						) : (
							<UnsyncIcon size={24} className="text-warning" />
						)
					) : null}
					<DebtsGroup className="shrink-0" debts={debts} />
				</View>
			</CardBody>
		</CardLink>
	);
};
