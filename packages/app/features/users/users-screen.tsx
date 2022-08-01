import React from "react";

import { Spacer, Text, styled } from "@nextui-org/react";
import { MdAdd as AddIcon, MdLink as LinkIcon } from "react-icons/md";

import { IconButton } from "app/components/icon-button";
import { Page } from "app/components/page";
import { EmailVerificationCard } from "app/features/email-verification/email-verification-card";

import { Users } from "./users";

const Header = styled("div", {
	display: "flex",
	justifyContent: "space-between",
});

const Title = styled(Text, {
	display: "flex",
	alignItems: "center",
});

const Buttons = styled("div", {
	display: "flex",
	flexShrink: 0,
});

export const UsersScreen: React.FC = () => (
	<Page>
		<Header>
			<Title h2>👨👩 Users</Title>
			<EmailVerificationCard />
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
