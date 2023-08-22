import React from "react";

import { Spacer } from "@nextui-org/react";
import { createParam } from "solito";

import { Header } from "app/components/header";
import { useTrpcMutationOptions } from "app/hooks/use-trpc-mutation-options";
import { mutations } from "app/mutations";
import { trpc } from "app/trpc";
import type { AppPage } from "next-app/types/page";

import { VoidAccount } from "./void-account";

const { useParam } = createParam<{ token: string }>();

export const VoidAccountScreen: AppPage = () => {
	const [token] = useParam("token");
	const voidAccountMutation = trpc.auth.voidAccount.useMutation(
		useTrpcMutationOptions(mutations.auth.voidAccount.options),
	);

	return (
		<>
			<Header>Void account</Header>
			<Spacer y={1} />
			<VoidAccount token={token} voidMutation={voidAccountMutation} />
		</>
	);
};
