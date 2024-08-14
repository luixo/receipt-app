import React from "react";

import { useParams } from "solito/navigation";

import { LoadableUser } from "~app/components/app/loadable-user";
import { PageHeader } from "~app/components/page-header";
import { trpc } from "~app/trpc";
import type { AppPage } from "~utils/next";

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
				<LoadableUser id={id} />
			</PageHeader>
			<User id={id} />
		</>
	);
};
