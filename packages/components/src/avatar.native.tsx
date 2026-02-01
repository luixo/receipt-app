import React from "react";
import { Image, Pressable } from "react-native";

import { Avatar as AvatarRaw } from "heroui-native";
import { Grayscale } from "react-native-color-matrix-image-filters";
import * as svg from "react-native-svg";

import { BeamAvatar } from "~components/beam-avatar";
import { Text } from "~components/text";
import { cn } from "~components/utils";
import { View } from "~components/view";

import type { GroupProps, Props } from "./avatar";

const AvatarGroupProvider = React.createContext<{
	size?: Props["size"];
} | null>(null);

const avatarComponents: React.ComponentProps<typeof BeamAvatar>["components"] =
	{
		Svg: (props) => <svg.Svg {...props} />,
		Mask: (props) => <svg.Mask {...props} />,
		Rect: (props) => <svg.Rect {...props} />,
		G: (props) => <svg.G {...props} />,
		Path: (props) => <svg.Path {...props} />,
		Filter: (props) => <svg.Filter {...props} />,
		FeColorMatrix: (props) => <svg.FeColorMatrix {...props} />,
	};

export const Avatar: React.FC<Props> = ({
	size,
	className,
	dimmed,
	fallback,
	image,
	hashId,
	onPress,
}) => {
	const avatarGroupContext = React.use(AvatarGroupProvider);
	const contextSize = avatarGroupContext?.size ?? size;
	const ref = React.useRef<HTMLSpanElement>(null);
	const [actualSize, setActualSize] = React.useState(0);
	React.useEffect(() => {
		if (!ref.current) {
			return;
		}
		setActualSize(Math.max(ref.current.offsetHeight, ref.current.offsetWidth));
	}, [contextSize]);
	const imageElement = image ? (
		<Image
			source={{ uri: image.url }}
			style={{ width: actualSize, height: actualSize }}
		/>
	) : null;
	return (
		<AvatarRaw
			size={contextSize}
			className={cn(className, avatarGroupContext ? "-ml-2" : undefined)}
			alt={image?.alt ?? ""}
			onLayout={(event) => {
				setActualSize(
					Math.max(
						event.nativeEvent.layout.height,
						event.nativeEvent.layout.width,
					),
				);
			}}
		>
			<Pressable
				onPress={onPress}
				style={{ width: actualSize, height: actualSize }}
				className="absolute z-10 rounded-full bg-transparent"
			/>
			{imageElement && image ? (
				<AvatarRaw.Image source={{ uri: image.url }} asChild>
					{dimmed ? <Grayscale>{imageElement}</Grayscale> : imageElement}
				</AvatarRaw.Image>
			) : null}
			<AvatarRaw.Fallback className={cn(dimmed ? "grayscale" : undefined)}>
				{fallback || (
					<BeamAvatar
						components={avatarComponents}
						size={actualSize}
						name={hashId || "unknown"}
						dimmed={dimmed}
					/>
				)}
			</AvatarRaw.Fallback>
		</AvatarRaw>
	);
};

export const AvatarGroup: React.FC<GroupProps> = ({
	children,
	max = 5,
	size,
}) => {
	const childrenCount = React.Children.count(children);
	return (
		<View className="ml-2 flex flex-row">
			<AvatarGroupProvider value={React.useMemo(() => ({ size }), [size])}>
				{React.Children.map(children, (child, index) =>
					index >= max ? null : child,
				)}
				{childrenCount > max ? (
					<Avatar
						fallback={
							<View>
								<Text>+{childrenCount - max}</Text>
							</View>
						}
					/>
				) : null}
			</AvatarGroupProvider>
		</View>
	);
};
