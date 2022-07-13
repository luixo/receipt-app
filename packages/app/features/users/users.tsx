import React from "react";

import type { InfiniteData } from "react-query";

import { Block } from "app/components/block";
import { TRPCQueryOutput } from "app/trpc";

import { UserPreview } from "./user-preview";

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
