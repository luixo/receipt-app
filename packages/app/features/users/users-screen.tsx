import React from "react";
import * as ReactNative from "react-native";

import { Spacer, Text, styled as nextStyled } from "@nextui-org/react";
import { MdAdd as AddIcon, MdLink as LinkIcon } from "react-icons/md";

import { IconButton } from "app/components/icon-button";
import { Page } from "app/components/page";
import { styled } from "app/utils/styles";

import { Users } from "./users";

const Header = styled(ReactNative.View)({
	flexDirection: "row",
	justifyContent: "space-between",
});

const Title = nextStyled(Text, {
	display: "flex",
	alignItems: "center",
});

const Buttons = styled(ReactNative.View)({
	flexDirection: "row",
	flexShrink: 0,
});

export const UsersScreen: React.FC = () => (
	<Page>
		<Header>
			<Title h2>👨👩 Users</Title>
			<Buttons>
				<IconButton
					href="/users/add"
					title="Add user"
					bordered
					icon={<AddIcon size={24} />}
				/>
				<Spacer x={0.5} />
				<IconButton
					href="/users/connections"
					title="Connection intentions"
					bordered
					icon={<LinkIcon size={24} />}
				/>
			</Buttons>
		</Header>
		<Spacer y={1} />
		<Users />
	</Page>
);
