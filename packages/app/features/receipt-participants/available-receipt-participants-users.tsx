import React from "react";
import * as ReactNative from "react-native";

import type { InfiniteData } from "react-query";

import { Block } from "app/components/block";
import { TRPCQueryOutput } from "app/trpc";
import { UsersId } from "next-app/db/models";

type AvailableUsersResult = TRPCQueryOutput<"users.get-available">;

type Props = {
	data: InfiniteData<AvailableUsersResult>;
	setValue: (userId: UsersId, userName: string) => void;
	disabled: boolean;
};

export const AvailableReceiptParticipantUsers: React.FC<Props> = ({
	data,
	setValue,
	disabled,
}) => {
	const allUsers = data.pages.reduce<AvailableUsersResult["items"]>(
		(acc, page) => [...acc, ...page.items],
		[]
	);
	return (
		<Block name={`Total: ${data.pages[0]?.count} available users`}>
			{allUsers.map((user) => (
				<ReactNative.Button
					key={user.id}
					onPress={disabled ? undefined : () => setValue(user.id, user.name)}
					title={user.name}
				/>
			))}
		</Block>
	);
};
