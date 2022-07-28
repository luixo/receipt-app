import React from "react";

import { Spacer, Text } from "@nextui-org/react";
import { createParam } from "solito";

import { Page } from "app/components/page";
import { trpc } from "app/trpc";

import { VoidAccount } from "./void-account";

const { useParam } = createParam<{ token: string }>();

export const VoidAccountScreen: React.FC = () => {
	const [token] = useParam("token");
	const voidAccountMutation = trpc.useMutation(["auth.void-account"]);

	return (
		<Page>
			<Text h2>Void account</Text>
			<Spacer y={1} />
			<VoidAccount token={token} voidMutation={voidAccountMutation} />
		</Page>
	);
};
