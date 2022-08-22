import React from "react";

import { Card, Spacer, styled } from "@nextui-org/react";

import { ColorModeSettings } from "app/features/settings/color-mode-settings";
import { RefreshSettings } from "app/features/settings/refresh-settings";
import { PageWithLayout } from "next-app/types/page";

const Wrapper = styled("div", {
	display: "flex",
	flexDirection: "column",
	alignItems: "center",
});

export const SettingsScreen: PageWithLayout = () => (
	<Wrapper>
		<ColorModeSettings />
		<Spacer y={1} />
		<Card.Divider />
		<Spacer y={1} />
		<RefreshSettings />
	</Wrapper>
);
