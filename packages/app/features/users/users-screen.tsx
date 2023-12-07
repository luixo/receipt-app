import React from "react";

import { Spacer } from "@nextui-org/react";
import { Button, Link } from "@nextui-org/react-tailwind";
import { MdAdd as AddIcon, MdLink as LinkIcon } from "react-icons/md";

import { Badge } from "app/components/badge";
import { Header } from "app/components/header";
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
						<Button
							key="add"
							href="/users/add"
							as={Link}
							color="primary"
							title="Add user"
							variant="bordered"
							isIconOnly
						>
							<AddIcon size={24} />
						</Button>,
						<Badge amount={inboundConnectionsAmount} key="connections">
							<Button
								href="/users/connections"
								as={Link}
								color="primary"
								title="Connection intentions"
								variant="bordered"
								isIconOnly
							>
								<LinkIcon size={24} />
							</Button>
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
