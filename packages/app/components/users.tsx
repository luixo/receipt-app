import React from "react";

import type { InfiniteData } from "react-query";

import { TRPCQueryOutput } from "../trpc";

import { UserPreview } from "./user-preview";
import { Block } from "./utils/block";

type InnerProps = {
	data: InfiniteData<TRPCQueryOutput<"users.get-paged">>;
};

export const Users: React.FC<InnerProps> = ({ data }) => {
	const allUsers = data.pages.reduce((acc, page) => [...acc, ...page], []);
	return (
		<Block name={`Total: ${allUsers.length} users`}>
			{allUsers.map((user) => (
				<UserPreview key={user.id} data={user} />
			))}
		</Block>
	);
};
