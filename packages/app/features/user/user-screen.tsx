import React from "react";

import { useParams } from "solito/navigation";

import { User as UserTitle } from "app/components/app/user";
import { PageHeader } from "app/components/page-header";
import { trpc } from "app/trpc";
import type { AppPage } from "next-app/types/page";

import { User } from "./user";

export const UserScreen: AppPage = () => {
	const { id } = useParams<{ id: string }>();

	const userQuery = trpc.users.get.useQuery({ id });
	const userNameQuery = trpc.users.getName.useQuery({ id });

	return (
		<>
			<PageHeader
				backHref="/users"
				title={
					userQuery.data ? userQuery.data.name : userNameQuery.data || "..."
				}
			>
				<UserTitle
					user={React.useMemo(
						() =>
							userQuery.data
								? {
										id: userQuery.data.localId || userQuery.data.remoteId,
										name: userQuery.data.name,
										publicName: userQuery.data.publicName,
										connectedAccount: userQuery.data.connectedAccount,
								  }
								: {
										id,
										name: userNameQuery.data || id,
										publicName: undefined,
										connectedAccount: undefined,
								  },
						[id, userNameQuery.data, userQuery.data],
					)}
				/>
			</PageHeader>
			<User id={id} />
		</>
	);
};
