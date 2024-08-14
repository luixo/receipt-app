import React from "react";

import { PageHeader } from "~app/components/page-header";
import { EmailVerificationCard } from "~app/features/email-verification/email-verification-card";
import { useConnectionIntentions } from "~app/hooks/use-connection-intentions";
import { Badge } from "~components/badge";
import { Button } from "~components/button";
import { AddIcon, LinkIcon, UsersIcon } from "~components/icons";
import { Link } from "~components/link";
import type { AppPage } from "~utils/next";

import { Users } from "./users";

export const UsersScreen: AppPage = () => {
	const inboundConnectionsAmount = useConnectionIntentions();
	const connectionsButton = React.useMemo(
		() => (
			<Button
				key="connections"
				href="/users/connections"
				as={Link}
				color="primary"
				title="Connection intentions"
				variant="bordered"
				isIconOnly
			>
				<LinkIcon size={24} />
			</Button>
		),
		[],
	);
	return (
		<>
			<PageHeader
				startContent={<UsersIcon size={36} />}
				aside={
					<>
						<Button
							href="/users/add"
							as={Link}
							color="primary"
							title="Add user"
							variant="bordered"
							isIconOnly
						>
							<AddIcon size={24} />
						</Button>
						{inboundConnectionsAmount === 0 ? (
							connectionsButton
						) : (
							<Badge
								content={inboundConnectionsAmount}
								color="danger"
								placement="top-right"
								size="lg"
							>
								{connectionsButton}
							</Badge>
						)}
					</>
				}
			>
				Users
			</PageHeader>
			<EmailVerificationCard />
			<Users />
		</>
	);
};
