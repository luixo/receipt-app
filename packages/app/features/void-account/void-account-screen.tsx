import React from "react";

import { Spacer } from "@nextui-org/react";
import { createParam } from "solito";

import { Header } from "app/components/header";
import { Page } from "app/components/page";
import { trpc } from "app/trpc";

import { VoidAccount } from "./void-account";

const { useParam } = createParam<{ token: string }>();

export const VoidAccountScreen: React.FC = () => {
	const [token] = useParam("token");
	const voidAccountMutation = trpc.useMutation(["auth.void-account"]);

	return (
		<Page>
			<Header>Void account</Header>
			<Spacer y={1} />
			<VoidAccount token={token} voidMutation={voidAccountMutation} />
		</Page>
	);
};
