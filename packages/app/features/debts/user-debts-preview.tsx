import React from "react";

import { Card, CardBody, Link, tv } from "@nextui-org/react";

import { DebtsGroup } from "app/components/app/debts-group";
import { LoadableUser } from "app/components/app/loadable-user";
import { useTrpcQueryOptions } from "app/hooks/use-trpc-query-options";
import { queries } from "app/queries";
import type { TRPCQueryOutput } from "app/trpc";
import { trpc } from "app/trpc";
import type { UsersId } from "next-app/db/models";

const card = tv({
	base: "flex flex-row flex-wrap items-end justify-between gap-4 md:flex-row md:items-center",
	variants: {
		transparent: {
			true: "opacity-50",
		},
	},
});

type Props = {
	debts: TRPCQueryOutput<"debts.getByUsers">[number]["debts"];
	userId: UsersId;
	transparent: boolean;
};

export const UserDebtsPreview: React.FC<Props> = ({
	debts,
	userId,
	transparent,
}) => {
	trpc.users.get.useQuery(
		{ id: userId },
		useTrpcQueryOptions(queries.users.get.options),
	);
	return (
		<Card as={Link} href={`/debts/user/${userId}`}>
			<CardBody className={card({ transparent })}>
				<LoadableUser id={userId} />
				<DebtsGroup className="shrink-0" debts={debts} />
			</CardBody>
		</Card>
	);
};
