import React from "react";

import { Spacer, Card } from "@nextui-org/react";

import { cache } from "app/cache";
import { DebtsGroup } from "app/components/app/debts-group";
import { LoadableUser } from "app/components/app/loadable-user";
import { Link } from "app/components/link";
import { useMatchMediaValue } from "app/hooks/use-match-media-value";
import { trpc, TRPCQueryOutput } from "app/trpc";
import { UsersId } from "next-app/db/models";

type Props = {
	debts: TRPCQueryOutput<"debts.getByUsers">[number]["debts"];
	userId: UsersId;
};

export const UserDebtsPreview: React.FC<Props> = ({ debts, userId }) => {
	const trpcContext = trpc.useContext();
	const userQuery = trpc.users.get.useQuery({ id: userId });
	const setUserName = React.useCallback(() => {
		if (userQuery.status !== "success") {
			return;
		}
		cache.users.getName.add(
			trpcContext,
			userQuery.data.remoteId,
			userQuery.data.name
		);
	}, [trpcContext, userQuery]);
	const showHorizontal = useMatchMediaValue(true, { lessMd: false });
	return (
		<Card>
			<Link href={`/debts/user/${userId}`} color="text">
				<Card.Body
					onClick={setUserName}
					css={{
						flexDirection: showHorizontal ? "row" : "column",
						alignItems: showHorizontal ? "center" : undefined,
						justifyContent: "space-between",
					}}
				>
					<LoadableUser id={userId} />
					<Spacer y={1} />
					<DebtsGroup debts={debts} />
				</Card.Body>
			</Link>
		</Card>
	);
};
