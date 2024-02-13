import React from "react";

import { User as RawUser, tv } from "@nextui-org/react";

import { useUserAvatarProps } from "app/components/app/user-avatar";
import type { TRPCQueryOutput } from "app/trpc";
import type { UsersId } from "next-app/db/models";

const wrapper = tv({ base: "text-foreground" });

export type Props = {
	id: UsersId;
	name: string;
	connectedAccount?: TRPCQueryOutput<"users.get">["connectedAccount"];
	foreign?: boolean;
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
			...props
		},
		ref,
	) => {
		const avatarProps = useUserAvatarProps({
			id,
			connectedAccount,
			foreign,
			...rawAvatarProps,
		});
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
