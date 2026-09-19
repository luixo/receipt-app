import type React from "react";

import type { User } from "~app/trpc-types";
import { Avatar } from "~components/avatar";
import type { UserId } from "~db/ids";

type UserAvatarInput = {
	id: UserId;
	connectedAccount?: User["connectedAccount"];
};

type Props = Omit<React.ComponentProps<typeof Avatar>, "hashId" | "image"> &
	UserAvatarInput;

export const getUserAvatarProps = ({
	id,
	connectedAccount,
}: UserAvatarInput) =>
	connectedAccount
		? {
				hashId: connectedAccount.id,
				image: connectedAccount.avatarUrl
					? { url: connectedAccount.avatarUrl, alt: connectedAccount.email }
					: undefined,
			}
		: { hashId: id };

export const UserAvatar: React.FC<Props> = ({
	id,
	connectedAccount,
	...props
}) => <Avatar {...getUserAvatarProps({ id, connectedAccount })} {...props} />;
