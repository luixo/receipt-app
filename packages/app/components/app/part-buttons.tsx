import type React from "react";
import { View } from "react-native";

import { Button } from "~components/button";
import { MinusIcon, PlusIcon } from "~components/icons";

type Props = React.PropsWithChildren<{
	updatePart: React.Dispatch<React.SetStateAction<number>>;
	downDisabled?: boolean;
	upDisabled?: boolean;
}>;

export const PartButtons: React.FC<Props> = ({
	updatePart,
	downDisabled,
	upDisabled,
	children,
}) => (
	<View className="flex-row items-center gap-2">
		<Button
			variant="ghost"
			color="primary"
			onPress={() => updatePart((prev) => prev - 1)}
			isDisabled={downDisabled}
			isIconOnly
		>
			<MinusIcon size={24} />
		</Button>
		{children}
		<Button
			variant="ghost"
			color="primary"
			onPress={() => updatePart((prev) => prev + 1)}
			isDisabled={upDisabled}
			isIconOnly
		>
			<PlusIcon size={24} />
		</Button>
	</View>
);
