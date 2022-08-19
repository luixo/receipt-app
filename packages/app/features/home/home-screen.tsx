import React from "react";

import { styled, Text, Spacer, Loading } from "@nextui-org/react";

import { QueryErrorMessage } from "app/components/error-message";
import { Page } from "app/components/page";
import { trpc } from "app/trpc";

import { CardButton, Gradient } from "./card-button";

const Wrapper = styled("div", {
	maxWidth: "$96",
	alignSelf: "center",
});

const GRADIENTS = {
	account: {
		colorStops: [
			[30, "blue400"],
			[140, "blue900"],
		],
		degree: 30,
	} as Gradient,
	receipts: {
		colorStops: [
			[20, "yellow600"],
			[100, "cyan700"],
		],
		degree: 40,
	} as Gradient,
	debts: {
		colorStops: [
			[-40, "red600"],
			[80, "purple700"],
		],
		degree: 75,
	} as Gradient,
	users: {
		colorStops: [
			[-20, "blue800"],
			[100, "red800"],
		],
		degree: 45,
	} as Gradient,
	register: {
		colorStops: [
			[-20, "green200"],
			[100, "blue400"],
		],
		degree: 30,
	} as Gradient,
	login: {
		colorStops: [
			[-20, "purple300"],
			[100, "pink100"],
		],
		degree: 0,
	} as Gradient,
};

export const HomeScreen: React.FC = () => {
	const accountQuery = trpc.useQuery(["account.get"]);

	let authBaseElement = null;
	if (accountQuery.status === "success") {
		authBaseElement = (
			<>
				<CardButton href="/receipts" gradient={GRADIENTS.receipts}>
					My receipts
				</CardButton>
				<Spacer y={1} />
				<CardButton href="/debts" gradient={GRADIENTS.debts}>
					My debts
				</CardButton>
				<Spacer y={1} />
				<CardButton href="/users" gradient={GRADIENTS.users}>
					My users
				</CardButton>
				<Spacer y={1} />
				<CardButton href="/account" gradient={GRADIENTS.account}>
					Manage account
				</CardButton>
			</>
		);
	} else if (accountQuery.status === "error") {
		if (accountQuery.error.data?.code === "UNAUTHORIZED") {
			authBaseElement = (
				<>
					<CardButton href="/register" gradient={GRADIENTS.register}>
						Register
					</CardButton>
					<Spacer y={1} />
					<CardButton href="/login" gradient={GRADIENTS.login}>
						Login
					</CardButton>
				</>
			);
		} else {
			authBaseElement = <QueryErrorMessage query={accountQuery} />;
		}
	} else {
		authBaseElement = <Loading size="xl" />;
	}

	return (
		<Page>
			<Wrapper>
				<Text h1 css={{ textAlign: "center", fontSize: "$xl7" }}>
					Receipt App
				</Text>
				<Spacer y={1} />
				{authBaseElement}
			</Wrapper>
		</Page>
	);
};
