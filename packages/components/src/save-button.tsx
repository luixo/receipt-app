import type React from "react";

import { Icon } from "~components/icons";

import { Button } from "./button";

export type Props = React.ComponentProps<typeof Button> & {
	title?: string;
	onPress: () => void;
};

export const SaveButton: React.FC<Props> = (props) => (
	<Button variant="ghost" isIconOnly className="text-success" {...props}>
		<Icon name="check" className="size-6" />
	</Button>
);
