import React from "react";

import { Switch } from "@nextui-org/react-tailwind";
import { FaCreativeCommonsZero as ResolveIcon } from "react-icons/fa";

import { useShowResolvedDebts } from "next-app/hooks/use-show-resolved-debts";

export const ShowResolvedDebtsOption: React.FC = () => {
	const [showResolvedDebts, setShowResolvedDebts] = useShowResolvedDebts();
	return (
		<Switch
			isSelected={showResolvedDebts}
			onValueChange={setShowResolvedDebts}
			thumbIcon={<ResolveIcon />}
		/>
	);
};
