import React from "react";

import { Switch } from "@nextui-org/react";
import { FaCreativeCommonsZero as ResolveIcon } from "react-icons/fa";

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
