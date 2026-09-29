import type React from "react";

import { useShowResolvedDebts } from "#app/hooks/use-show-resolved-debts.ts";
import { Icon } from "#components/icons.tsx";
import { Switch } from "#components/switch.tsx";

export const ShowResolvedDebtsOption: React.FC<
	React.ComponentProps<typeof Switch>
> = (props) => {
	const [showResolvedDebts, setShowResolvedDebts] = useShowResolvedDebts();
	return (
		<Switch
			testID="show-resolved-debts-switch"
			isSelected={showResolvedDebts}
			onValueChange={setShowResolvedDebts}
			thumbIcon={<Icon name="check" />}
			{...props}
		/>
	);
};
