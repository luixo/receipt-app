import React from "react";

import { Spacer } from "@nextui-org/react";
import { MdAdd as AddIcon, MdLink as LinkIcon } from "react-icons/md";

import { Header } from "app/components/header";
import { IconButton } from "app/components/icon-button";
import { Page } from "app/components/page";
import { EmailVerificationCard } from "app/features/email-verification/email-verification-card";

import { Users } from "./users";

export const UsersScreen: React.FC = () => (
	<Page>
		<Header
			icon="👨👩"
			aside={React.useMemo(
				() => [
					<IconButton
						key="add"
						href="/users/add"
						title="Add user"
						bordered
						icon={<AddIcon size={24} />}
					/>,
					<IconButton
						key="connections"
						href="/users/connections"
						title="Connection intentions"
						bordered
						icon={<LinkIcon size={24} />}
					/>,
				],
				[]
			)}
		>
			Users
		</Header>
		<EmailVerificationCard />
		<Spacer y={1} />
		<Users />
	</Page>
);
