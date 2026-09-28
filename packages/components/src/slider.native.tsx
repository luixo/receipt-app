import { Slider as NativeSlider } from "heroui-native";

import type { Props } from "~components/slider";

export const Slider: React.FC<Props> = ({
	label,
	onChange,
	onChangeEnd,
	...props
}) => (
	<NativeSlider
		{...props}
		aria-label={label}
		onChange={(value) =>
			onChange?.(Array.isArray(value) ? (value[0] ?? 0) : value)
		}
		onChangeEnd={(value) =>
			onChangeEnd?.(Array.isArray(value) ? (value[0] ?? 0) : value)
		}
	>
		<NativeSlider.Track>
			<NativeSlider.Fill />
		</NativeSlider.Track>
		<NativeSlider.Thumb />
	</NativeSlider>
);
