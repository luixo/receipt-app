import type React from "react";

import { DebtsGroup } from "~app/components/app/debts-group";
import { LoadableUser } from "~app/components/app/loadable-user";
import { type TRPCQueryOutput, trpc } from "~app/trpc";
import { Card, CardBody } from "~components/card";
import { SyncIcon, UnsyncIcon } from "~components/icons";
import { Link } from "~components/link";
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
	const userQuery = trpc.users.get.useQuery({ id: userId });
	const accountSettingsQuery = trpc.accountSettings.get.useQuery();
	return (
		<Card as={Link} href={`/debts/user/${userId}`}>
			<CardBody className={card({ transparent })}>
				<LoadableUser id={userId} />
				<div className="flex items-center justify-center gap-2">
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
				</div>
			</CardBody>
		</Card>
	);
};
