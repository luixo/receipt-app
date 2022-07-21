import React from "react";

import { useDripsyTheme } from "dripsy";
import IdenticonJs from "identicon.js";
import Image from "next/image";

type Props = {
	hash: string;
	size: number;
};

export const Identicon: React.FC<Props> = ({ hash, size }) => {
	const { theme } = useDripsyTheme();
	const icon = React.useMemo(() => {
		const backgroundColor = theme?.colors.background.slice(1);
		return new IdenticonJs(hash, {
			background: [
				parseInt(backgroundColor.slice(1, 2), 16),
				parseInt(backgroundColor.slice(3, 2), 16),
				parseInt(backgroundColor.slice(5, 2), 16),
				0,
			],
			margin: 0.05,
			size,
			format: "svg",
		}).toString();
	}, [hash, size, theme]);
	return (
		<Image
			width={size}
			height={size}
			alt="avatar"
			src={`data:image/svg+xml;base64,${icon}`}
		/>
	);
};
