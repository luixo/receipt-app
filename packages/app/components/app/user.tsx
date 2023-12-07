import React from "react";

import { User as RawUser } from "@nextui-org/react-tailwind";
import IdenticonJs from "identicon.js";

import type { UsersId } from "next-app/db/models";

const getIdenticon = (hash: string, size: number) =>
	`data:image/svg+xml;base64,${new IdenticonJs(hash, {
		background: [255, 255, 255, 0],
		margin: 0.05,
		size,
		format: "svg",
	}).toString()}`;

export type Props = {
	user: {
		id: UsersId;
		name: string;
		publicName?: string;
		email?: string;
	};
} & Omit<React.ComponentProps<typeof RawUser>, "name" | "description">;

export const User = React.forwardRef<HTMLDivElement, Props>(
	({ user, ...props }, ref) => {
		const icon = React.useMemo(() => getIdenticon(user.id, 40), [user.id]);
		return (
			<RawUser
				ref={ref}
				{...props}
				name={user.name + (user.publicName ? ` (${user.publicName})` : "")}
				description={user.email}
				avatarProps={{
					src: icon,
					radius: "sm",
					...props.avatarProps,
					classNames: {
						base: "bg-transparent",
						...props.avatarProps?.classNames,
					},
				}}
			/>
		);
	},
);
