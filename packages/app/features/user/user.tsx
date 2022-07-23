import React from "react";
import * as ReactNative from "react-native";

import { Cache } from "app/cache";
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
	input: Cache.Users.Get.Input;
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
