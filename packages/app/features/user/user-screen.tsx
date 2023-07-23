import React from "react";

import { Spacer } from "@nextui-org/react";
import { createParam } from "solito";

import { User as UserTitle } from "app/components/app/user";
import { Header } from "app/components/header";
import { trpc } from "app/trpc";
import { AppPage } from "next-app/types/page";

import { User } from "./user";

const { useParam } = createParam<{ id: string }>();

export const UserScreen: AppPage = () => {
	const [id] = useParam("id");
	if (!id) {
		throw new Error("No id in param");
	}

	const userQuery = trpc.users.get.useQuery({ id });
	const userNameQuery = trpc.users.getName.useQuery({ id });

	return (
		<>
			<Header
				backHref="/users"
				textChildren={
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
										email: userQuery.data.email,
								  }
								: {
										id,
										name: userNameQuery.data || id,
										publicName: null,
										email: null,
								  },
						[id, userNameQuery.data, userQuery.data],
					)}
				/>
			</Header>
			<Spacer y={1} />
			<User id={id} />
		</>
	);
};
