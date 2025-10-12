import type React from "react";

import type { UserAvatar } from "~app/components/app/user-avatar";
import {
	useSkeletonUserAvatarProps,
	useUserAvatarProps,
} from "~app/components/app/user-avatar";
import type { TRPCQueryOutput } from "~app/trpc";
import { Avatar } from "~components/avatar";
import { Skeleton } from "~components/skeleton";
import { User as RawUser } from "~components/user";
import { cn } from "~components/utils";
import type { UserId } from "~db/ids";

export const SkeletonUser: React.FC<
	Omit<Props, "id" | "name" | "connectedAccount">
> = ({ className, onlyAvatar, avatarProps: rawAvatarProps, ...props }) => {
	const avatarProps = useSkeletonUserAvatarProps(rawAvatarProps || {});
	if (onlyAvatar) {
		return <Avatar {...avatarProps} />;
	}
	return (
		<RawUser
			{...props}
			data-testid="user-skeleton"
			className={cn("text-foreground", className)}
			name={<Skeleton className="h-4 w-20 rounded" />}
			description={<Skeleton className="mt-1 h-3 w-10 rounded" />}
			avatarProps={avatarProps}
		/>
	);
};

export type Props = {
	id: UserId;
	name: string;
	connectedAccount?: TRPCQueryOutput<"users.get">["connectedAccount"];
	onlyAvatar?: boolean;
	avatarProps?: Partial<
		Omit<
			NonNullable<React.ComponentProps<typeof RawUser>["avatarProps"]>,
			"size"
		> & {
			size:
				| NonNullable<
						React.ComponentProps<typeof RawUser>["avatarProps"]
				  >["size"]
				| "xs";
		}
	>;
} & Omit<
	React.ComponentProps<typeof RawUser>,
	"name" | "description" | "avatarProps"
> &
	Pick<React.ComponentProps<typeof UserAvatar>, "dimmed">;

export const User: React.FC<Props> = ({
	id,
	name,
	connectedAccount,
	className,
	avatarProps: rawAvatarProps,
	dimmed,
	onlyAvatar,
	ref,
	...props
}) => {
	const avatarInput = {
		id,
		connectedAccount,
		dimmed,
		...rawAvatarProps,
	};
	const avatarProps = useUserAvatarProps(avatarInput);
	if (onlyAvatar) {
		return <Avatar {...avatarProps} />;
	}
	return (
		<RawUser
			ref={ref}
			{...props}
			data-testid="user"
			className={cn("text-foreground", className)}
			name={name}
			description={connectedAccount?.email}
			avatarProps={avatarProps}
		/>
	);
};
