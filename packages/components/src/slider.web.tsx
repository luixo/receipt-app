import type React from "react";

import { Slider as SliderRaw } from "@heroui/slider";

export type Props = Pick<
	React.ComponentProps<typeof SliderRaw>,
	"className" | "minValue" | "maxValue" | "step" | "orientation" | "isDisabled"
> & {
	value?: number;
	onChange?: (nextValue: number) => void;
	onChangeEnd?: (nextValue: number) => void;
	label?: string;
};
export const Slider: React.FC<Props> = ({
	label,
	onChange,
	onChangeEnd,
	...props
}) => (
	<SliderRaw
		{...props}
		aria-label={label}
		onChange={onChange as (nextValue: number | number[]) => void}
		onChangeEnd={onChangeEnd as (nextValue: number | number[]) => void}
	/>
);
