import React from "react";

import { User as RawUser, tv } from "@nextui-org/react";

import { useUserAvatarProps } from "app/components/app/user-avatar";
import type { TRPCQueryOutput } from "app/trpc";
import type { MakeOptional } from "app/utils/types";

const wrapper = tv({ base: "text-foreground" });

export type Props = {
	user: MakeOptional<
		Pick<
			TRPCQueryOutput<"users.getPaged">["items"][number],
			"id" | "account" | "name" | "publicName"
		>
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
				description={user.account?.email}
				avatarProps={avatarProps}
			/>
		);
	},
);
