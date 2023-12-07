import React from "react";

import { Spacer } from "@nextui-org/react";
import { createParam } from "solito";

import { Text } from "app/components/base/text";
import { Header } from "app/components/header";
import type { AppPage } from "next-app/types/page";

import { VoidAccount } from "./void-account";

const { useParam } = createParam<{ token: string }>();

export const VoidAccountScreen: AppPage = () => {
	const [token] = useParam("token");

	return (
		<>
			<Header>Void account</Header>
			<Spacer y={1} />
			{token ? (
				<VoidAccount token={token} />
			) : (
				<>
					<Text className="text-2xl font-medium">Something went wrong</Text>
					<Text>Please verify you got void account link right</Text>
				</>
			)}
		</>
	);
};
