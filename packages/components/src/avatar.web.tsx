import React from "react";

import {
	AvatarGroup as AvatarGroupRaw,
	Avatar as AvatarRaw,
} from "@heroui/react";

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
	testID?: string;
};

export const useAvatarProps = ({
	className,
	dimmed,
	fallback,
	image,
	hashId,
	onPress,
	testID = "user-avatar",
	...props
}: Props) => {
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
		image,
		className: cn("shrink-0 bg-transparent", dimmed && "grayscale", className),
		onClick: onPress,
		"data-testid": testID,
	};
};

export const Avatar: React.FC<Props> = (props) => {
	const { fallback, image, ...root } = useAvatarProps(props);
	return (
		<AvatarRaw {...root}>
			{image ? <AvatarRaw.Image src={image.url} alt={image.alt} /> : null}
			<AvatarRaw.Fallback className="size-full">{fallback}</AvatarRaw.Fallback>
		</AvatarRaw>
	);
};

export type GroupContext = {
	size?: Props["size"];
};

export type GroupProps = GroupContext &
	React.PropsWithChildren<{
		max?: number;
		className?: string;
	}>;

export const AvatarGroup: React.FC<GroupProps> = AvatarGroupRaw;
