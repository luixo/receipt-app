import type React from "react";

import type { Peer } from "~app/trpc-types";
import { Avatar } from "~components/avatar";
import type { PeerId } from "~db/ids";

type PeerAvatarInput = {
	id: PeerId;
	connectedAccount?: Peer["connectedAccount"];
};

type Props = Omit<React.ComponentProps<typeof Avatar>, "hashId" | "image"> &
	PeerAvatarInput;

export const getPeerAvatarProps = ({
	id,
	connectedAccount,
}: PeerAvatarInput) =>
	connectedAccount
		? {
				hashId: connectedAccount.id,
				image: connectedAccount.avatarUrl
					? { url: connectedAccount.avatarUrl, alt: connectedAccount.email }
					: undefined,
			}
		: { hashId: id };

export const PeerAvatar: React.FC<Props> = ({
	id,
	connectedAccount,
	...props
}) => <Avatar {...getPeerAvatarProps({ id, connectedAccount })} {...props} />;
