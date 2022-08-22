import React from "react";

import { Spacer } from "@nextui-org/react";
import { createParam } from "solito";

import { Header } from "app/components/header";
import { trpc } from "app/trpc";
import { PageWithLayout } from "next-app/types/page";

import { VoidAccount } from "./void-account";

const { useParam } = createParam<{ token: string }>();

export const VoidAccountScreen: PageWithLayout = () => {
	const [token] = useParam("token");
	const voidAccountMutation = trpc.useMutation(["auth.void-account"]);

	return (
		<>
			<Header>Void account</Header>
			<Spacer y={1} />
			<VoidAccount token={token} voidMutation={voidAccountMutation} />
		</>
	);
};
