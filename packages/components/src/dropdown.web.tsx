import type React from "react";

import { Dropdown as DropdownRaw } from "@heroui/react";

type ItemProps = React.PropsWithChildren<{
	key: string;
	className?: string;
}>;

export type Props = React.PropsWithChildren<{
	items: ItemProps[];
	testID?: string;
}>;

export const Dropdown: React.FC<Props> = ({ children, items, testID }) => (
	<DropdownRaw>
		<DropdownRaw.Trigger data-testid={testID}>{children}</DropdownRaw.Trigger>
		<DropdownRaw.Popover>
			<DropdownRaw.Menu items={items}>
				{({ key, ...itemProps }) => (
					<DropdownRaw.Item
						id={key}
						textValue={
							typeof itemProps.children === "string" ? itemProps.children : key
						}
						{...itemProps}
					/>
				)}
			</DropdownRaw.Menu>
		</DropdownRaw.Popover>
	</DropdownRaw>
);
