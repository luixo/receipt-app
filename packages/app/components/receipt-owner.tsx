import React from "react";
import { TRPCQueryOutput } from "../trpc";
import { Text } from "../utils/styles";

type Props = {
	data: TRPCQueryOutput<"users.get">;
};

export const ReceiptOwner: React.FC<Props> = ({ data }) => (
	<Text>Owner: {data.name}</Text>
);
