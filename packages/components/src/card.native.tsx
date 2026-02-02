import type React from "react";
import { TouchableOpacity } from "react-native";

import { Card as CardRaw } from "heroui-native";
import { tv } from "tailwind-variants";

import { Divider } from "~components/divider";

import type { Props } from "./card";

const toast = tv({
	slots: {
		wrapper: "outline-content3 p-0 outline-1",
		body: "p-3",
		header: "p-3",
		footer: "p-3",
	},
});

export const Card: React.FC<Props> = ({
	className,
	testID,
	bodyClassName,
	header,
	headerClassName,
	footer,
	footerClassName,
	onPress,
	children,
}) => {
	const slots = toast();
	const card = (
		<CardRaw className={slots.wrapper({ className })} testID={testID}>
			{header ? (
				<>
					<CardRaw.Header
						className={slots.header({ className: headerClassName })}
					>
						{header}
					</CardRaw.Header>
					<Divider />
				</>
			) : null}
			<CardRaw.Body className={slots.body({ className: bodyClassName })}>
				{children}
			</CardRaw.Body>
			{footer ? (
				<>
					<Divider />
					<CardRaw.Footer
						className={slots.footer({ className: footerClassName })}
					>
						{footer}
					</CardRaw.Footer>
				</>
			) : null}
		</CardRaw>
	);
	if (onPress) {
		return <TouchableOpacity onPress={onPress}>{card}</TouchableOpacity>;
	}
	return card;
};
