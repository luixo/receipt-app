import React from "react";
import * as ReactNative from "react-native";

import { Picker } from "@react-native-picker/picker";

import { TRPCQueryOutput } from "app/trpc";
import { UsersId } from "next-app/src/db/models";

type UsersResult = TRPCQueryOutput<"users.get-paged">;

type Props = {
	users: UsersResult["items"];
	userId?: UsersId;
	onChange: (nextUserId: UsersId) => void;
	loadMore: () => void;
};

export const UsersPicker: React.FC<Props> = ({
	users,
	userId: value,
	onChange: onChangeProps,
	loadMore,
}) => (
	<>
		<Picker selectedValue={value} onValueChange={onChangeProps}>
			{users.map((user) => (
				<Picker.Item key={user.id} label={user.name} value={user.id} />
			))}
		</Picker>
		<ReactNative.Button title="Load more users" onPress={loadMore} />
	</>
);
