import type React from "react";

import { CheckMark } from "~components/icons";

import { Button } from "./button";

export type Props = React.ComponentProps<typeof Button> & {
	title?: string;
	onPress: () => void;
};

export const SaveButton: React.FC<Props> = (props) => (
	<Button variant="light" isIconOnly color="success" {...props}>
		<CheckMark size={24} />
	</Button>
);
