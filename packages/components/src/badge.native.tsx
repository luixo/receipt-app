import { tv } from "tailwind-variants";

import type { Props } from "~components/badge";
import { Text } from "~components/text";
import { View } from "~components/view";

const badge = tv({
	slots: {
		base: "relative self-start",
		badge:
			"border-background min-size-6 text-small absolute top-0 right-0 z-10 box-border translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-[2px] font-medium",
	},
	variants: {
		color: {
			danger: {
				badge: "bg-danger text-danger-foreground",
			},
			warning: {
				badge: "bg-warning text-warning-foreground",
			},
		},
		chars: {
			none: {
				badge: "size-4",
			},
			one: {
				badge: "size-6",
			},
			many: {
				badge: "px-1",
			},
		},
	},
});

export const Badge: React.FC<Props> = ({
	content: rawContent,
	color,
	isInvisible,
	children,
	className,
}) => {
	const content = rawContent === undefined ? "" : String(rawContent);
	const slots = badge({
		color,
		chars:
			content.length === 0 ? "none" : content.length === 1 ? "one" : "many",
	});
	return (
		<View className={slots.base()}>
			{children}
			{isInvisible ? null : (
				<View className={slots.badge({ className })}>
					{content ? <Text>{content}</Text> : null}
				</View>
			)}
		</View>
	);
};
