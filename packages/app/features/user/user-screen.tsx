import React from "react";

import { Text, Spacer } from "@nextui-org/react";
import { useSx } from "dripsy";
import { createParam } from "solito";

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
	const sx = useSx();

	const usersGetInput: UsersGetInput = { id };
	const userNameQuery = trpc.useQuery(["users.get-name", usersGetInput]);
	const userQuery = trpc.useQuery(["users.get", usersGetInput]);

	return (
		<ScrollView contentContainerStyle={sx({ padding: "md" })}>
			<Text h2>{`🧑 ${userNameQuery.data || id}`}</Text>
			<Spacer y={1} />
			<QueryWrapper query={userQuery} input={usersGetInput}>
				{User}
			</QueryWrapper>
		</ScrollView>
	);
};
