import React from "react";

import { Switch, SwitchEvent } from "@nextui-org/react";
import { FaCreativeCommonsZero as ResolveIcon } from "react-icons/fa";

import { useShowResolvedDebts } from "next-app/hooks/use-show-resolved-debts";

export const ShowResolvedDebtsOption: React.FC = () => {
	const [showResolvedDebts, setShowResolvedDebts] = useShowResolvedDebts();
	const onResolvedChange = React.useCallback(
		(e: SwitchEvent) => setShowResolvedDebts(e.target.checked),
		[setShowResolvedDebts]
	);
	return (
		<Switch
			checked={showResolvedDebts}
			onChange={onResolvedChange}
			icon={<ResolveIcon />}
			bordered
		/>
	);
};
