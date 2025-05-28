import React from "react";
import { View } from "react-native";

import { Header } from "~components/header";
import { tv } from "~components/utils";

const wrapper = tv({
	base: "m-10 gap-4 self-center md:max-w-lg",
});

type Props = {
	title: string;
	startContent?: React.ReactNode;
	endContent?: React.ReactNode;
} & React.ComponentProps<typeof View>;

export const EmptyCard = React.memo<Props>(
	({ title, children, startContent, endContent, ...props }) => (
		<View
			{...props}
			className={wrapper({ className: props.className })}
			testID="empty-card"
		>
			{startContent}
			<Header size="lg" className="text-center">
				{title}
			</Header>
			<Header size="md" className="text-center">
				{children}
			</Header>
			{endContent}
		</View>
	),
);
