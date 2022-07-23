import React from "react";

import { Text, Spacer, styled } from "@nextui-org/react";
import { createParam } from "solito";

import { Cache } from "app/cache";
import { Identicon } from "app/components/identicon";
import { Page } from "app/components/page";
import { QueryWrapper } from "app/components/query-wrapper";
import { trpc } from "app/trpc";

import { User } from "./user";

const Header = styled(Text, {
	display: "flex",
	alignItems: "center",
});

const { useParam } = createParam<{ id: string }>();

export const UserScreen: React.FC = () => {
	const [id] = useParam("id");
	if (!id) {
		throw new Error("No id in param");
	}

	const usersGetInput: Cache.Users.Get.Input = { id };
	const userNameQuery = trpc.useQuery(["users.get-name", usersGetInput]);
	const userQuery = trpc.useQuery(["users.get", usersGetInput]);

	return (
		<Page>
			<Header h2>
				<Identicon size={40} hash={id} />
				<Spacer x={0.5} />
				{userNameQuery.data || id}
			</Header>
			<Spacer y={1} />
			<QueryWrapper query={userQuery} input={usersGetInput}>
				{User}
			</QueryWrapper>
		</Page>
	);
};
