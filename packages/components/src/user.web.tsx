import type React from "react";

import { Avatar } from "~components/avatar";
import type { Props as AvatarProps } from "~components/avatar";
import { cn } from "~components/utils";

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
}) => (
	<div
		data-testid={testID}
		className={cn("relative flex items-center gap-2", props.className)}
	>
		<Avatar {...avatarPropsRaw} />
		<div>
			<div>{props.name}</div>
			{props.description ? (
				<div className="text-muted">{props.description}</div>
			) : null}
		</div>
		{onPress ? (
			<button
				type="button"
				className="absolute inset-0"
				onClick={onPress}
				aria-label={typeof props.name === "string" ? props.name : "Open user"}
			/>
		) : null}
	</div>
);
