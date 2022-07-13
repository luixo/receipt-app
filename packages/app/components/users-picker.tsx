import React from "react";

import { Picker } from "@react-native-picker/picker";
import type { InfiniteData } from "react-query";

import { UsersId } from "next-app/src/db/models";

import { TRPCQueryOutput } from "../trpc";

const LOAD_MORE_OPTION = "__load-more" as const;

type Props = {
	data: InfiniteData<TRPCQueryOutput<"users.get-paged">>;
	value?: UsersId;
	onChange: (nextUserId: UsersId) => void;
	loadMore: () => void;
};

export const UsersPicker: React.FC<Props> = ({
	data,
	value,
	onChange: onChangeProps,
	loadMore,
}) => {
	const availableUsers = data.pages
		.reduce((acc, page) => [...acc, ...page], [])
		.filter((user) => !user.email && !user.dirty);
	const onChange = React.useCallback(
		(userId: UsersId | typeof LOAD_MORE_OPTION) => {
			if (userId === LOAD_MORE_OPTION) {
				loadMore();
				return;
			}
			onChangeProps(userId);
		},
		[onChangeProps, loadMore]
	);
	return (
		<Picker selectedValue={value} onValueChange={onChange}>
			{availableUsers.map((user) => (
				<Picker.Item key={user.id} label={user.name} value={user.id} />
			))}
			<Picker.Item label="load more" value={LOAD_MORE_OPTION} />
		</Picker>
	);
};
