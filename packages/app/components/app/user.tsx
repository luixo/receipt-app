import React from "react";

import {
	UserAvatar,
	useUserAvatarProps,
} from "~app/components/app/user-avatar";
import type { TRPCQueryOutput } from "~app/trpc";
import { Avatar } from "~components/avatar";
import { Chip } from "~components/chip";
import { Skeleton } from "~components/skeleton";
import { User as RawUser } from "~components/user";
import { tv } from "~components/utils";
import type { UsersId } from "~db/models";

const wrapper = tv({ base: "text-foreground" });

export const SkeletonUser: React.FC<
	Omit<Props, "id" | "name" | "connectedAccount">
> = ({
	className,
	onlyAvatar,
	avatarProps: rawAvatarProps,
	chip,
	...props
}) => {
	const avatarProps = {
		...rawAvatarProps,
		showFallback: true,
		fallback: <Skeleton className="size-full" />,
		classNames: { fallback: "size-full" },
		size: rawAvatarProps?.size
			? rawAvatarProps.size === "xs"
				? "sm"
				: rawAvatarProps.size
			: chip
			? "sm"
			: undefined,
	};
	if (onlyAvatar) {
		return <Avatar {...avatarProps} />;
	}
	if (chip) {
		return (
			<Chip
				data-testid="user-chip-skeleton"
				className={wrapper({ className })}
				avatar={<Avatar {...avatarProps} />}
				onClick={props.onClick}
				{...(typeof chip === "boolean" ? {} : chip)}
			>
				<Skeleton className="h-4 w-12 rounded" />
			</Chip>
		);
	}
	return (
		<RawUser
			{...props}
			data-testid="user-skeleton"
			className={wrapper({ className })}
			name={<Skeleton className="h-4 w-20 rounded" />}
			description={<Skeleton className="mt-1 h-3 w-10 rounded" />}
			avatarProps={avatarProps}
		/>
	);
};

export type Props = {
	id: UsersId;
	name: string;
	connectedAccount?: TRPCQueryOutput<"users.get">["connectedAccount"];
	chip?: boolean | React.ComponentProps<typeof Chip>;
	onlyAvatar?: boolean;
	avatarProps?: Omit<
		NonNullable<React.ComponentProps<typeof RawUser>["avatarProps"]>,
		"size"
	> & {
		size:
			| NonNullable<React.ComponentProps<typeof RawUser>["avatarProps"]>["size"]
			| "xs";
	};
} & Omit<
	React.ComponentProps<typeof RawUser>,
	"name" | "description" | "avatarProps"
> &
	Pick<React.ComponentProps<typeof UserAvatar>, "dimmed">;

export const User = React.forwardRef<HTMLDivElement, Props>(
	(
		{
			id,
			name,
			connectedAccount,
			className,
			avatarProps: rawAvatarProps,
			dimmed,
			onlyAvatar,
			chip,
			...props
		},
		ref,
	) => {
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
		if (chip) {
			return (
				<Chip
					ref={ref}
					data-testid="user-chip"
					className={wrapper({ className })}
					avatar={<UserAvatar size="xs" {...avatarInput} />}
					onClick={props.onClick}
					{...(typeof chip === "boolean" ? {} : chip)}
				>
					{name}
				</Chip>
			);
		}
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
