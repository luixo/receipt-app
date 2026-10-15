import type React from "react";

import { Slider as SliderRaw } from "@heroui/react";

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
		onChange={(value) =>
			onChange?.(Array.isArray(value) ? (value[0] ?? 0) : value)
		}
	>
		<SliderRaw.Track>
			<SliderRaw.Fill />
			<SliderRaw.Thumb />
		</SliderRaw.Track>
	</SliderRaw>
);
