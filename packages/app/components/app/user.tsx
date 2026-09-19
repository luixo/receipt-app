import type React from "react";

import { getUserAvatarProps } from "~app/components/app/user-avatar";
import type { User as UserType } from "~app/trpc-types";
import { Skeleton } from "~components/skeleton";
import { User as RawUser } from "~components/user";
import { cn } from "~components/utils";
import type { UserId } from "~db/ids";

export const SkeletonUser: React.FC<
	Omit<Props, "id" | "name" | "connectedAccount" | "avatarProps">
> = ({ className, ...props }) => (
	<RawUser
		{...props}
		testID="user-skeleton"
		className={cn("text-foreground", className)}
		name={<Skeleton className="h-4 w-20 rounded-sm" />}
		description={<Skeleton className="mt-1 h-3 w-10 rounded-sm" />}
		avatarProps={{
			fallback: <Skeleton className="size-full" />,
		}}
	/>
);

export type Props = {
	id: UserId;
	name: string;
	connectedAccount?: UserType["connectedAccount"];
} & Omit<React.ComponentProps<typeof RawUser>, "name" | "description">;

export const User: React.FC<Props> = ({
	id,
	name,
	connectedAccount,
	className,
	avatarProps: rawAvatarProps,
	...props
}) => (
	<RawUser
		{...props}
		testID="user"
		className={cn("text-foreground", className)}
		name={name}
		description={connectedAccount?.email}
		avatarProps={{
			...getUserAvatarProps({ id, connectedAccount }),
			...rawAvatarProps,
		}}
	/>
);
