import type React from "react";
import { View } from "react-native";

import {
	DebtsGroup,
	DebtsGroupSkeleton,
} from "~app/components/app/debts-group";
import { LoadableUser } from "~app/components/app/loadable-user";
import { SkeletonUser } from "~app/components/app/user";
import type { TRPCQueryOutput } from "~app/trpc";
import { Card, CardBody } from "~components/card";
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
};

export const UserDebtsPreview: React.FC<Props> = ({
	debts,
	userId,
	transparent,
}) => (
	<CardLink to="/debts/user/$id" params={{ id: userId }}>
		<CardBody className={card({ transparent })}>
			<LoadableUser id={userId} />
			<View className="flex flex-row items-center justify-center gap-2">
				<DebtsGroup className="shrink-0" debts={debts} />
			</View>
		</CardBody>
	</CardLink>
);
