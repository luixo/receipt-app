import type React from "react";

import { BottomSheet } from "heroui-native";
import { tv } from "tailwind-variants";

import { Icon } from "~components/icons";
import { View } from "~components/view";

import type { Props } from "./modal";

const modal = tv({
	slots: {
		content: "gap-8",
		closeButton: "absolute top-0 right-0 z-10 px-4",
	},
});

export const Modal: React.FC<Props> = ({
	isOpen,
	onOpenChange,
	label,
	testID,
	header,
	children,
	className,
	bodyClassName,
	headerClassName,
	closeButton,
}) => {
	const slots = modal();
	return (
		<BottomSheet
			isOpen={isOpen}
			onOpenChange={onOpenChange}
			testID={testID}
			aria-label={label}
			className={className}
		>
			<BottomSheet.Portal>
				<BottomSheet.Overlay />
				<BottomSheet.Content contentContainerClassName={slots.content()}>
					{closeButton ? (
						<View className={slots.closeButton()}>
							<BottomSheet.Close>
								<Icon name="close" className="size-5" />
							</BottomSheet.Close>
						</View>
					) : null}
					{header ? <View className={headerClassName}>{header}</View> : null}
					<View className={bodyClassName}>{children}</View>
				</BottomSheet.Content>
			</BottomSheet.Portal>
		</BottomSheet>
	);
};
