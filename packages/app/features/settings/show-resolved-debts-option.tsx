import React from "react";

import { Switch } from "~components";
import { ResolveIcon } from "~components/icons";
import { useShowResolvedDebts } from "~web/hooks/use-show-resolved-debts";

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
