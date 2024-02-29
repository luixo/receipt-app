import React from "react";

import { DebtsGroup } from "~app/components/app/debts-group";
import { LoadableUser } from "~app/components/app/loadable-user";
import type { TRPCQueryOutput } from "~app/trpc";
import { Card, CardBody, Link, tv } from "~components";
import type { UsersId } from "~db";

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
}) => (
	<Card as={Link} href={`/debts/user/${userId}`}>
		<CardBody className={card({ transparent })}>
			<LoadableUser id={userId} />
			<DebtsGroup className="shrink-0" debts={debts} />
		</CardBody>
	</Card>
);
