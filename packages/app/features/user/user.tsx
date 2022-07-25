import React from "react";
import * as ReactNative from "react-native";

import { TRPCQueryOutput } from "app/trpc";
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
};

export const User: React.FC<Props> = ({ data: user }) => {
	const [deleteLoading, setDeleteLoading] = React.useState(false);
	return (
		<>
			<UserNameInput user={user} isLoading={deleteLoading} />
			<UserPublicNameInput user={user} isLoading={deleteLoading} />
			<UserConnectionInput user={user} isLoading={deleteLoading} />
			<AlignEndView>
				<UserRemoveButton user={user} setLoading={setDeleteLoading} />
			</AlignEndView>
		</>
	);
};
