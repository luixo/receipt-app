import type React from "react";

import { Switch as SwitchRaw } from "heroui-native";
import { tv } from "tailwind-variants";
import { useResolveClassNames } from "uniwind";

import type { Props } from "./switch";

const switchVariants = tv({
	slots: {
		wrapper: "",
		thumb: "",
	},
	variants: {
		size: {
			sm: {
				wrapper: "h-5 w-10",
				thumb: "h-4 w-6",
			},
			md: {
				wrapper: "h-6 w-12",
				thumb: "h-5 w-7",
			},
			lg: {
				wrapper: "h-7 w-14",
				thumb: "h-6 w-8",
			},
		},
	},
	defaultVariants: {
		size: "md",
	},
});

export const Switch: React.FC<Props> = ({
	isSelected,
	onValueChange,
	thumbIcon,
	isDisabled,
	isReadOnly,
	size,
	className,
	thumbClassName,
}) => {
	const slots = switchVariants({ size });
	const wrapperStyle = useResolveClassNames(className || "");
	const thumbStyle = useResolveClassNames(thumbClassName || "");
	return (
		<SwitchRaw
			isSelected={isSelected}
			onSelectedChange={isReadOnly ? undefined : onValueChange}
			isDisabled={isDisabled}
			className={slots.wrapper({ className })}
			animation={
				isReadOnly
					? "disable-all"
					: {
							backgroundColor: wrapperStyle.backgroundColor
								? {
										value: [
											wrapperStyle.backgroundColor as string,
											wrapperStyle.backgroundColor as string,
										],
									}
								: undefined,
						}
			}
		>
			<SwitchRaw.Thumb
				className={slots.thumb({ className: thumbClassName })}
				animation={{
					backgroundColor: thumbStyle.backgroundColor
						? {
								value: [
									thumbStyle.backgroundColor as string,
									thumbStyle.backgroundColor as string,
								],
							}
						: undefined,
				}}
			>
				{thumbIcon}
			</SwitchRaw.Thumb>
		</SwitchRaw>
	);
};
