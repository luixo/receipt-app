import React from "react";

import { Spacer } from "@nextui-org/react";
import { createParam } from "solito";

import { User as UserTitle } from "app/components/app/user";
import { Header } from "app/components/header";
import { trpc } from "app/trpc";
import { PageWithLayout } from "next-app/types/page";

import { User } from "./user";

const { useParam } = createParam<{ id: string }>();

export const UserScreen: PageWithLayout = () => {
	const [id] = useParam("id");
	if (!id) {
		throw new Error("No id in param");
	}

	const userNameQuery = trpc.users.getName.useQuery({ id });

	return (
		<>
			<Header backHref="/users">
				<UserTitle
					user={React.useMemo(
						() => ({ id, name: userNameQuery.data || id }),
						[id, userNameQuery.data]
					)}
				/>
			</Header>
			<Spacer y={1} />
			<User id={id} />
		</>
	);
};
