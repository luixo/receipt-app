import React from "react";

import { Card, Spacer, styled, Text } from "@nextui-org/react";

import { ColorModeSettings } from "app/features/settings/color-mode-settings";
import { RefreshSettings } from "app/features/settings/refresh-settings";
import { ShowResolvedDebtsOption } from "app/features/settings/show-resolved-debts-option";
import { AppPage } from "next-app/types/page";

const Wrapper = styled("div", {
	display: "flex",
	flexDirection: "column",
	alignItems: "center",
});

const Line = styled("div", {
	display: "flex",
	alignItems: "center",
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
		<Spacer y={1} />
		<Card.Divider />
		<Spacer y={1} />
		<RefreshSettings />
	</Wrapper>
);
