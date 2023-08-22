import React from "react";

import { Spacer } from "@nextui-org/react";
import { MdAdd as AddIcon, MdLink as LinkIcon } from "react-icons/md";

import { Badge } from "app/components/badge";
import { Header } from "app/components/header";
import { IconButton } from "app/components/icon-button";
import { EmailVerificationCard } from "app/features/email-verification/email-verification-card";
import { useConnectionIntentions } from "app/hooks/use-connection-intentions";
import type { AppPage } from "next-app/types/page";

import { Users } from "./users";

export const UsersScreen: AppPage = () => {
	const inboundConnectionsAmount = useConnectionIntentions();
	return (
		<>
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
						<Badge amount={inboundConnectionsAmount} key="connections">
							<IconButton
								href="/users/connections"
								title="Connection intentions"
								bordered
								icon={<LinkIcon size={24} />}
							/>
						</Badge>,
					],
					[inboundConnectionsAmount],
				)}
			>
				Users
			</Header>
			<EmailVerificationCard />
			<Spacer y={1} />
			<Users />
		</>
	);
};
