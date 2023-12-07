import React from "react";
import { View } from "react-native";

import { tv } from "@nextui-org/react-tailwind";

import { Header } from "app/components/base/header";

const wrapper = tv({
	base: "m-10 gap-4 self-center md:max-w-lg",
});

type Props = React.PropsWithChildren<{
	title: string;
}> &
	Omit<React.ComponentProps<typeof View>, "children">;

export const EmptyCard = React.memo<Props>(({ title, children, ...props }) => (
	<View {...props} className={wrapper({ className: props.className })}>
		<Header size="lg" className="text-center">
			{title}
		</Header>
		<Header size="md" className="text-center">
			{children}
		</Header>
	</View>
));
