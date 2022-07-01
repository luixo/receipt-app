import React from "react";
import { createParam } from "solito";
import { trpc } from "../../trpc";
import { User } from "../../components/user";
import { QueryWrapper } from "../../components/utils/query-wrapper";
import { Block } from "../../components/utils/block";
import { BackButton } from "../../components/utils/back-button";
import { ScrollView } from "../../utils/styles";
import { UsersGetInput } from "../../utils/queries/users-get";

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
				<QueryWrapper query={userQuery}>{User}</QueryWrapper>
			</Block>
		</ScrollView>
	);
};
