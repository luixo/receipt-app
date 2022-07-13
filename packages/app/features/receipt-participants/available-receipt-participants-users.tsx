import React from "react";
import * as ReactNative from "react-native";

import type { InfiniteData } from "react-query";

import { Block } from "app/components/block";
import { TRPCQueryOutput } from "app/trpc";
import { UsersId } from "next-app/db/models";

type Props = {
	data: InfiniteData<TRPCQueryOutput<"users.get-available">>;
	setValue: (userId: UsersId, userName: string) => void;
	disabled: boolean;
};

export const AvailableReceiptParticipantUsers: React.FC<Props> = ({
	data,
	setValue,
	disabled,
}) => {
	const allUsers = data.pages.reduce<TRPCQueryOutput<"users.get-available">>(
		(acc, page) => [...acc, ...page],
		[]
	);
	return (
		<Block name="Available users">
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
