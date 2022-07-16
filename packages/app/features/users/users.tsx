import React from "react";

import type { InfiniteData } from "react-query";

import { Block } from "app/components/block";
import { TRPCQueryOutput } from "app/trpc";

import { UserPreview } from "./user-preview";

type UsersResult = TRPCQueryOutput<"users.get-paged">;

type InnerProps = {
	data: InfiniteData<UsersResult>;
};

export const Users: React.FC<InnerProps> = ({ data }) => {
	const allUsers = data.pages.reduce<UsersResult["items"]>(
		(acc, page) => [...acc, ...page.items],
		[]
	);
	return (
		<Block name={`Total: ${data.pages[0]?.count} users`}>
			{allUsers.map((user) => (
				<UserPreview key={user.id} data={user} />
			))}
		</Block>
	);
};
