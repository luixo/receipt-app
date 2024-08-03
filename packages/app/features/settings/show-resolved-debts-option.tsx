import type React from "react";

import { useShowResolvedDebts } from "~app/hooks/use-show-resolved-debts";
import { Switch } from "~components";
import { ResolveIcon } from "~components/icons";

export const ShowResolvedDebtsOption: React.FC<
	React.ComponentProps<typeof Switch>
> = (props) => {
	const [showResolvedDebts, setShowResolvedDebts] = useShowResolvedDebts();
	return (
		<Switch
			isSelected={showResolvedDebts}
			onValueChange={setShowResolvedDebts}
			thumbIcon={<ResolveIcon />}
			{...props}
		/>
	);
};
