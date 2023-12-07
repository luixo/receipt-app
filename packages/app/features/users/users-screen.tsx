import React from "react";

import { Badge, Button, Link, Spacer } from "@nextui-org/react-tailwind";
import { FaUsers as UsersIcon } from "react-icons/fa";
import { MdAdd as AddIcon, MdLink as LinkIcon } from "react-icons/md";

import { Header } from "app/components/header";
import { EmailVerificationCard } from "app/features/email-verification/email-verification-card";
import { useConnectionIntentions } from "app/hooks/use-connection-intentions";
import type { AppPage } from "next-app/types/page";

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
			<Header
				startContent={<UsersIcon size={36} />}
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
						inboundConnectionsAmount === 0 ? (
							connectionsButton
						) : (
							<Badge
								key="connections"
								content={inboundConnectionsAmount}
								color="danger"
								placement="top-right"
								size="lg"
							>
								{connectionsButton}
							</Badge>
						),
					],
					[inboundConnectionsAmount, connectionsButton],
				)}
			>
				Users
			</Header>
			<EmailVerificationCard />
			<Spacer y={4} />
			<Users />
		</>
	);
};
