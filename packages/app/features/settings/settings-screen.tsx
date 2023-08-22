import React from "react";

import { Card, Spacer, Text, styled } from "@nextui-org/react";

import type { AppPage } from "next-app/types/page";

import { AutoAcceptDebtsOption } from "./auto-accept-debts-option";
import { ColorModeSettings } from "./color-mode-settings";
import { RefreshSettings } from "./refresh-settings";
import { ShowResolvedDebtsOption } from "./show-resolved-debts-option";

const Wrapper = styled("div", {
	display: "flex",
	flexDirection: "column",
	alignItems: "center",
});

const Line = styled("div", {
	display: "flex",
	alignItems: "center",

	"& + &": {
		marginTop: 12,
	},
});

export const SettingsScreen: AppPage = () => (
	<Wrapper>
		<ColorModeSettings />
		<Spacer y={1} />
		<Card.Divider />
		<Spacer y={1} />
		<Text h2>Settings</Text>
		<Line>
			<Text>Show user with resolved debts</Text>
			<Spacer x={1} />
			<ShowResolvedDebtsOption />
		</Line>
		<Line>
			<Text>Auto-accept debts</Text>
			<Spacer x={1} />
			<AutoAcceptDebtsOption />
		</Line>
		<Spacer y={1} />
		<Card.Divider />
		<Spacer y={1} />
		<RefreshSettings />
	</Wrapper>
);
