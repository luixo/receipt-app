import React from "react";

import { TRPCQueryOutput } from "app/trpc";
import { Text } from "app/utils/styles";

type Props = {
	data: TRPCQueryOutput<"users.get">;
};

export const ReceiptOwner: React.FC<Props> = ({ data }) => (
	<Text>Owner: {data.name}</Text>
);
