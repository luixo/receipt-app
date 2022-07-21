import React from "react";

import { Button, Loading } from "@nextui-org/react";

type Props = React.ComponentProps<typeof Button> & { isLoading?: boolean };

export const IconButton: React.FC<Props> = ({ isLoading, ...props }) => {
	if (isLoading) {
		return <Loading size="xs" />;
	}
	return (
		<Button
			auto
			light
			{...props}
			css={{
				background: "$transparent",
				borderWidth: 0,
			}}
		/>
	);
};
