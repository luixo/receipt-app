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

	return (
		<>
			<PageHeader
				backHref="/users"
				title={userQuery.data ? userQuery.data.name : id}
			>
				<UserTitle
					user={React.useMemo(
						() =>
							userQuery.data
								? userQuery.data
								: {
										remoteId: id,
										localId: null,
										name: "...",
										publicName: undefined,
										connectedAccount: undefined,
								  },
						[id, userQuery.data],
					)}
				/>
			</PageHeader>
			<User id={id} />
		</>
	);
};
