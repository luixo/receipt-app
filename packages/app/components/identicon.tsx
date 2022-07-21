import React from "react";

import { styled, Image as NextUIImage } from "@nextui-org/react";
import { DripsyFinalTheme, useDripsyTheme } from "dripsy";
import IdenticonJs from "identicon.js";

const Image = styled(NextUIImage, {
	flexShrink: 0,
	margin: 0,
});

type Props = {
	hash: string;
	size: number;
	altText?: string;
};

export const getIdenticon = (
	hash: string,
	size: number,
	theme: DripsyFinalTheme
) => {
	const backgroundColor = theme?.colors.background.slice(1);
	return `data:image/svg+xml;base64,${new IdenticonJs(hash, {
		background: [
			parseInt(backgroundColor.slice(1, 2), 16),
			parseInt(backgroundColor.slice(3, 2), 16),
			parseInt(backgroundColor.slice(5, 2), 16),
			0,
		],
		margin: 0.05,
		size,
		format: "svg",
	}).toString()}`;
};

export const Identicon: React.FC<Props> = ({
	hash,
	size,
	altText = "Avatar",
}) => {
	const { theme } = useDripsyTheme();
	const icon = React.useMemo(
		() => getIdenticon(hash, size, theme),
		[hash, size, theme]
	);
	return <Image width={size} height={size} alt={altText} src={icon} />;
};
