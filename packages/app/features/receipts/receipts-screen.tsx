import React from "react";

import { Spacer, styled, Text } from "@nextui-org/react";
import { MdAdd as AddIcon } from "react-icons/md";

import { IconButton } from "app/components/icon-button";
import { Page } from "app/components/page";
import { EmailVerificationCard } from "app/features/email-verification/email-verification-card";

import { Receipts } from "./receipts";

const Header = styled("div", {
	display: "flex",
	flexDirection: "row",
	justifyContent: "space-between",
});

const Title = styled(Text, {
	display: "flex",
	alignItems: "center",
});

const Buttons = styled("div", {
	flexDirection: "row",
	flexShrink: 0,
});

export const ReceiptsScreen: React.FC = () => (
	<Page>
		<Header>
			<Title h2>🧾 Receipts</Title>
			<Buttons>
				<IconButton
					href="/users/add"
					title="Add receipt"
					bordered
					icon={<AddIcon size={24} />}
				/>
			</Buttons>
		</Header>
		<EmailVerificationCard />
		<Spacer y={1} />
		<Receipts />
	</Page>
);
