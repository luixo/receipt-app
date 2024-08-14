import React from "react";

import {
	UserAvatar,
	useUserAvatarProps,
} from "~app/components/app/user-avatar";
import type { TRPCQueryOutput } from "~app/trpc";
import { Chip } from "~components/chip";
import { User as RawUser } from "~components/user";
import { tv } from "~components/utils";
import type { UsersId } from "~db/models";

const wrapper = tv({ base: "text-foreground" });

export type Props = {
	id: UsersId;
	name: string;
	connectedAccount?: TRPCQueryOutput<"users.get">["connectedAccount"];
	foreign?: boolean;
	chip?: boolean | React.ComponentProps<typeof Chip>;
} & Omit<React.ComponentProps<typeof RawUser>, "name" | "description">;

export const User = React.forwardRef<HTMLDivElement, Props>(
	(
		{
			id,
			name,
			connectedAccount,
			className,
			avatarProps: rawAvatarProps,
			foreign,
			chip,
			...props
		},
		ref,
	) => {
		const avatarInput = {
			id,
			connectedAccount,
			foreign,
			...rawAvatarProps,
		};
		const avatarProps = useUserAvatarProps(avatarInput);
		if (chip) {
			return (
				<Chip
					ref={ref}
					data-testid="user-chip"
					className={wrapper({ className })}
					avatar={<UserAvatar size="xs" {...avatarInput} />}
					onClick={props.onClick}
					{...(typeof chip === "boolean" ? {} : chip)}
				>
					{name}
				</Chip>
			);
		}
		return (
			<RawUser
				ref={ref}
				{...props}
				data-testid="user"
				className={wrapper({ className })}
				name={name}
				description={connectedAccount?.email}
				avatarProps={avatarProps}
			/>
		);
	},
);
