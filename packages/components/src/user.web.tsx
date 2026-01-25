import type React from "react";

import { User as UserRaw } from "@heroui/user";

import type { Props as AvatarProps } from "~components/avatar";
import { useAvatarProps } from "~components/avatar.web";

export type Props = {
	avatarProps?: AvatarProps;
	name: React.ReactElement | string;
	description?: React.ReactElement | string;
	testID?: string;
	className?: string;
	onPress?: () => void;
};

export const User: React.FC<Props> = ({
	avatarProps: avatarPropsRaw = {},
	testID,
	onPress,
	...props
}) => {
	const avatarProps = useAvatarProps(avatarPropsRaw);
	return (
		<UserRaw
			avatarProps={avatarProps}
			data-testid={testID}
			onClick={onPress}
			{...props}
		/>
	);
};
