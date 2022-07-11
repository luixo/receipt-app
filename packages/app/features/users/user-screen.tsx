import React from "react";

import { createParam } from "solito";

import { User } from "../../components/user";
import { BackButton } from "../../components/utils/back-button";
import { Block } from "../../components/utils/block";
import { QueryWrapper } from "../../components/utils/query-wrapper";
import { trpc } from "../../trpc";
import { UsersGetInput } from "../../utils/queries/users-get";
import { DEFAULT_INPUT } from "../../utils/queries/users-get-paged";
import { ScrollView } from "../../utils/styles";

const { useParam } = createParam<{ id: string }>();

export const UserScreen: React.FC = () => {
	const [id] = useParam("id");
	if (!id) {
		throw new Error("No id in param");
	}

	const usersGetInput: UsersGetInput = { id };
	const userQuery = trpc.useQuery(["users.get", usersGetInput]);

	return (
		<ScrollView>
			<Block name={`User: ${userQuery.data ? userQuery.data.name : id}`}>
				<BackButton href="/users/" />
				<QueryWrapper
					query={userQuery}
					input={usersGetInput}
					pagedInput={DEFAULT_INPUT}
				>
					{User}
				</QueryWrapper>
			</Block>
		</ScrollView>
	);
};
