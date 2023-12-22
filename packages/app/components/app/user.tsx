import React from "react";

import { User as RawUser, tv } from "@nextui-org/react";

import { useUserAvatarProps } from "app/components/app/user-avatar";
import type { TRPCQueryOutput } from "app/trpc";
import type { MakeOptional } from "app/utils/types";

const wrapper = tv({ base: "text-foreground" });

type UserType = TRPCQueryOutput<"users.getPaged">["items"][number];

export type Props = {
	user: MakeOptional<
		Omit<UserType, "connectedAccount"> & {
			connectedAccount?: MakeOptional<
				NonNullable<UserType["connectedAccount"]>
			>;
		}
	>;
} & Omit<React.ComponentProps<typeof RawUser>, "name" | "description">;

export const User = React.forwardRef<HTMLDivElement, Props>(
	({ user, className, avatarProps: rawAvatarProps, ...props }, ref) => {
		const avatarProps = useUserAvatarProps({ ...user, ...rawAvatarProps });
		return (
			<RawUser
				ref={ref}
				{...props}
				className={wrapper({ className })}
				name={user.name + (user.publicName ? ` (${user.publicName})` : "")}
				description={user.connectedAccount?.email}
				avatarProps={avatarProps}
			/>
		);
	},
);
