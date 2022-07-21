import React from "react";

import { useSx } from "dripsy";

import { ScrollView } from "app/utils/styles";

type Props = {
	children: React.ReactNode;
};

export const Page: React.FC<Props> = ({ children }) => {
	const sx = useSx();
	return (
		<ScrollView contentContainerStyle={sx({ padding: "md" })}>
			{children}
		</ScrollView>
	);
};
