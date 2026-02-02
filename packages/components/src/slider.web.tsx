import type React from "react";

import { Slider as SliderRaw } from "@heroui/slider";

export type Props = Pick<
	React.ComponentProps<typeof SliderRaw>,
	"className" | "minValue" | "maxValue" | "step" | "orientation"
> & {
	value?: number;
	onChange?: (nextValue: number) => void;
	label?: string;
};
export const Slider: React.FC<Props> = ({ label, onChange, ...props }) => (
	<SliderRaw
		{...props}
		aria-label={label}
		onChange={onChange as (nextValue: number | number[]) => void}
	/>
);
