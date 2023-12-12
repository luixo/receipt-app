import React from "react";

import { User as RawUser, tv } from "@nextui-org/react";
import IdenticonJs from "identicon.js";

import type { AccountsId, UsersId } from "next-app/db/models";

const styles = tv({
	base: "text-foreground",
	slots: {
		avatar: "bg-transparent",
	},
});

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
		account?: {
			id: AccountsId;
			email: string;
		};
	};
} & Omit<React.ComponentProps<typeof RawUser>, "name" | "description">;

export const User = React.forwardRef<HTMLDivElement, Props>(
	({ user, className, avatarProps, ...props }, ref) => {
		const icon = React.useMemo(() => getIdenticon(user.id, 40), [user.id]);
		const { base, avatar } = styles();
		return (
			<RawUser
				ref={ref}
				{...props}
				className={base({ className })}
				name={user.name + (user.publicName ? ` (${user.publicName})` : "")}
				description={user.account?.email}
				avatarProps={{
					src: icon,
					radius: "sm",
					...avatarProps,
					classNames: {
						...avatarProps?.classNames,
						base: avatar({ className: avatarProps?.className }),
					},
				}}
			/>
		);
	},
);
