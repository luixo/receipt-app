import type React from "react";

import type { Peer } from "#app/trpc-types.ts";
import { Avatar } from "#components/avatar.tsx";
import type { PeerId } from "#db/ids.ts";

type PeerAvatarInput = {
	id: PeerId;
	connectedUser?: Peer["connectedUser"];
};

type Props = Omit<React.ComponentProps<typeof Avatar>, "hashId" | "image"> &
	PeerAvatarInput;

export const getPeerAvatarProps = ({ id, connectedUser }: PeerAvatarInput) =>
	connectedUser
		? {
				hashId: connectedUser.id,
				image: connectedUser.avatarUrl
					? { url: connectedUser.avatarUrl, alt: connectedUser.email }
					: undefined,
			}
		: { hashId: id };

export const PeerAvatar: React.FC<Props> = ({
	id,
	connectedUser,
	...props
}) => <Avatar {...getPeerAvatarProps({ id, connectedUser })} {...props} />;
