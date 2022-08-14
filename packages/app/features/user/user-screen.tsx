import React from "react";

import { Spacer } from "@nextui-org/react";
import { createParam } from "solito";

import { User as UserTitle } from "app/components/app/user";
import { Header } from "app/components/header";
import { Page } from "app/components/page";
import { trpc } from "app/trpc";

import { User } from "./user";

const { useParam } = createParam<{ id: string }>();

export const UserScreen: React.FC = () => {
	const [id] = useParam("id");
	if (!id) {
		throw new Error("No id in param");
	}

	const userNameQuery = trpc.useQuery(["users.get-name", { id }]);

	return (
		<Page>
			<Header>
				<UserTitle
					user={React.useMemo(
						() => ({ id, name: userNameQuery.data || id }),
						[id, userNameQuery.data]
					)}
				/>
			</Header>
			<Spacer y={1} />
			<User id={id} />
		</Page>
	);
};
