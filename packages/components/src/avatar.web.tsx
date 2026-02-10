import React from "react";

import {
	AvatarGroup as AvatarGroupRaw,
	Avatar as AvatarRaw,
	useAvatarGroupContext,
} from "@heroui/avatar";

import { BeamAvatar } from "~components/beam-avatar";
import { cn } from "~components/utils";

const avatarComponents: React.ComponentProps<typeof BeamAvatar>["components"] =
	{
		Svg: (props) => <svg {...props} />,
		Mask: (props) => <mask {...props} />,
		Rect: (props) => <rect {...props} />,
		G: (props) => <g {...props} />,
		Path: (props) => <path {...props} />,
		Filter: (props) => <filter {...props} />,
		FeColorMatrix: (props) => <feColorMatrix {...props} />,
	};

export type Props = {
	size?: "sm" | "md" | "lg";
	className?: string;
	dimmed?: boolean;
	fallback?: React.ReactNode;
	image?: {
		url: string;
		alt: string;
	};
	hashId?: string;
	onPress?: () => void;
};

export const useAvatarProps = ({
	className,
	dimmed,
	fallback,
	image,
	hashId,
	onPress,
	...props
}: Props): React.ComponentProps<typeof AvatarRaw> => {
	const ref = React.useRef<HTMLSpanElement>(null);
	const [actualSize, setActualSize] = React.useState(0);
	React.useEffect(() => {
		if (!ref.current) {
			return;
		}
		setActualSize(Math.max(ref.current.offsetHeight, ref.current.offsetWidth));
	}, [props.size]);
	return {
		...props,
		ref,
		fallback: fallback || (
			<BeamAvatar
				size={actualSize}
				name={hashId ?? "unknown"}
				components={avatarComponents}
				dimmed={dimmed}
			/>
		),
		imgProps: image
			? {
					alt: image.alt,
					width: actualSize,
					height: actualSize,
				}
			: undefined,
		src: image?.url,
		radius: "full",
		classNames: {
			fallback: "size-full",
			base: cn(
				// The hover=true is needed to remove default translation of avatars in avatar group
				"shrink-0 bg-transparent data-[hover=true]:translate-x-0",
				dimmed ? "grayscale" : undefined,
				className,
			),
		},
		onClick: onPress,
	};
};

export const Avatar: React.FC<Props> = (props) => {
	const avatarGroupContext = useAvatarGroupContext();
	return <AvatarRaw {...useAvatarProps({ ...avatarGroupContext, ...props })} />;
};

export type GroupContext = {
	size?: Props["size"];
};

export type GroupProps = GroupContext &
	React.PropsWithChildren<{
		max?: number;
		className?: string;
	}>;

export const AvatarGroup: React.FC<GroupProps> = ({ size, ...props }) => (
	<AvatarGroupRaw
		{...props}
		// It's just being passed through as a context
		size={size as "sm"}
	/>
);
