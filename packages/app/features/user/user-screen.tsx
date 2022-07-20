import React from "react";

import { createParam } from "solito";

import { BackButton } from "app/components/back-button";
import { Block } from "app/components/block";
import { QueryWrapper } from "app/components/query-wrapper";
import { trpc } from "app/trpc";
import { UsersGetInput } from "app/utils/queries/users-get";
import { ScrollView } from "app/utils/styles";

import { User } from "./user";

const { useParam } = createParam<{ id: string }>();

export const UserScreen: React.FC = () => {
	const [id] = useParam("id");
	if (!id) {
		throw new Error("No id in param");
	}

	const usersGetInput: UsersGetInput = { id };
	const userNameQuery = trpc.useQuery(["users.get-name", usersGetInput]);
	const userQuery = trpc.useQuery(["users.get", usersGetInput]);

	return (
		<ScrollView>
			<Block name={`User: ${userNameQuery.data || id}`}>
				<BackButton href="/users/" />
				<QueryWrapper query={userQuery} input={usersGetInput}>
					{User}
				</QueryWrapper>
			</Block>
		</ScrollView>
	);
};
