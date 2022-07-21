import React from "react";
import * as ReactNative from "react-native";

import { TRPCQueryOutput } from "app/trpc";
import { UsersGetInput } from "app/utils/queries/users-get";
import { styled } from "app/utils/styles";

import { UserConnectionInput } from "./user-connection-input";
import { UserNameInput } from "./user-name-input";
import { UserPublicNameInput } from "./user-public-name-input";
import { UserRemoveButton } from "./user-remove-button";

const AlignEndView = styled(ReactNative.View)({
	alignSelf: "flex-end",
});

type Props = {
	data: TRPCQueryOutput<"users.get">;
	input: UsersGetInput;
};

export const User: React.FC<Props> = ({ data: user, input }) => {
	const [deleteLoading, setDeleteLoading] = React.useState(false);
	return (
		<>
			<UserNameInput user={user} isLoading={deleteLoading} input={input} />
			<UserPublicNameInput
				user={user}
				isLoading={deleteLoading}
				input={input}
			/>
			<UserConnectionInput
				user={user}
				input={input}
				isLoading={deleteLoading}
			/>
			<AlignEndView>
				<UserRemoveButton
					user={user}
					input={input}
					setLoading={setDeleteLoading}
				/>
			</AlignEndView>
		</>
	);
};
