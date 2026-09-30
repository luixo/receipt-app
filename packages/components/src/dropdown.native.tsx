import type React from "react";

import { Menu } from "heroui-native/menu";

type DropdownItemProps = React.PropsWithChildren<{
	key: string;
	className?: string;
}>;

type DropdownProps = React.PropsWithChildren<{
	items: DropdownItemProps[];
	testID?: string;
}>;

export const Dropdown: React.FC<DropdownProps> = ({
	children,
	items,
	testID,
}) => (
	<Menu testID={testID}>
		<Menu.Trigger>{children}</Menu.Trigger>
		<Menu.Portal>
			<Menu.Overlay />
			<Menu.Content presentation="popover">
				<Menu.Close />
				{items.map(({ key, ...itemProps }) => (
					<Menu.Item key={key} {...itemProps} />
				))}
			</Menu.Content>
		</Menu.Portal>
	</Menu>
);
