import type React from "react";

import { getPeerAvatarProps } from "~app/components/app/peer-avatar";
import type { Peer as PeerType } from "~app/trpc-types";
import { Skeleton } from "~components/skeleton";
import { User as RawUser } from "~components/user";
import { cn } from "~components/utils";
import type { PeerId } from "~db/ids";

export const SkeletonPeer: React.FC<
	Omit<Props, "id" | "name" | "connectedUser" | "avatarProps">
> = ({ className, ...props }) => (
	<RawUser
		{...props}
		testID="peer-skeleton"
		className={cn("text-foreground", className)}
		name={<Skeleton className="h-4 w-20 rounded-sm" />}
		description={<Skeleton className="mt-1 h-3 w-10 rounded-sm" />}
		avatarProps={{
			fallback: <Skeleton className="size-full" />,
		}}
	/>
);

export type Props = {
	id: PeerId;
	name: string;
	connectedUser?: PeerType["connectedUser"];
} & Omit<React.ComponentProps<typeof RawUser>, "name" | "description">;

export const Peer: React.FC<Props> = ({
	id,
	name,
	connectedUser,
	className,
	avatarProps: rawAvatarProps,
	...props
}) => (
	<RawUser
		{...props}
		testID="peer"
		className={cn("text-foreground", className)}
		name={name}
		description={connectedUser?.email}
		avatarProps={{
			...getPeerAvatarProps({ id, connectedUser }),
			...rawAvatarProps,
		}}
	/>
);
