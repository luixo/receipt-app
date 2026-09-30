import type React from "react";

import {
	DropdownItem,
	DropdownMenu,
	Dropdown as DropdownRaw,
	DropdownTrigger,
} from "@heroui/dropdown";

type ItemProps = React.PropsWithChildren<{
	key: string;
	className?: string;
}>;

export type Props = React.PropsWithChildren<{
	items: ItemProps[];
	testID?: string;
}>;

export const Dropdown: React.FC<Props> = ({ children, items, testID }) => (
	<DropdownRaw data-testid={testID}>
		<DropdownTrigger>{children}</DropdownTrigger>
		<DropdownMenu items={items}>
			{({ key, ...itemProps }) => <DropdownItem key={key} {...itemProps} />}
		</DropdownMenu>
	</DropdownRaw>
);
