import type React from "react";

import { Button } from "~components/button";
import { Icon } from "~components/icons";
import type { ViewReactNode } from "~components/view";
import { View } from "~components/view";

type Props = {
	updatePart: React.Dispatch<React.SetStateAction<number>>;
	downDisabled?: boolean;
	upDisabled?: boolean;
	children?: ViewReactNode;
};

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
			<Icon name="minus" className="size-6" />
		</Button>
		{children}
		<Button
			variant="ghost"
			color="primary"
			onPress={() => updatePart((prev) => prev + 1)}
			isDisabled={upDisabled}
			isIconOnly
		>
			<Icon name="plus" className="size-6" />
		</Button>
	</View>
);
