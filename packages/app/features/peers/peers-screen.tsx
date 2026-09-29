import type React from "react";

import { useTranslation } from "react-i18next";

import { AmountBadge } from "#app/components/amount-badge.tsx";
import { PageHeader } from "#app/components/page-header.tsx";
import { EmailVerificationCard } from "#app/features/email-verification/email-verification-card.tsx";
import { useConnectionIntentions } from "#app/hooks/use-connection-intentions.ts";
import { useDefaultLimit } from "#app/hooks/use-default-limit.ts";
import { getPathHooks } from "#app/utils/navigation.tsx";
import { Icon } from "#components/icons.tsx";
import { ButtonLink } from "#components/link.tsx";

import { Peers } from "./peers";

export const PeersScreen = () => {
	const { useQueryState, useDefaultedQueryState } =
		getPathHooks("/_protected/peers/");
	const limitState = useDefaultedQueryState("limit", useDefaultLimit());
	const offsetState = useQueryState("offset");
	const { t } = useTranslation("peers");
	return (
		<>
			<PageHeader
				startContent={<Icon name="users" className="size-9" />}
				aside={
					<>
						<ButtonLink
							to="/peers/add"
							color="primary"
							title={t("list.addPeer.button")}
							variant="bordered"
							isIconOnly
						>
							<Icon name="add" className="size-6" />
						</ButtonLink>
						<AmountBadge useAmount={useConnectionIntentions}>
							<ButtonLink
								key="connections"
								to="/peers/connections"
								color="primary"
								title={t("list.connections.title")}
								variant="bordered"
								isIconOnly
							>
								<Icon name="link" className="size-6" />
							</ButtonLink>
						</AmountBadge>
					</>
				}
			>
				{t("list.header")}
			</PageHeader>
			<EmailVerificationCard />
			<Peers limitState={limitState} offsetState={offsetState} />
		</>
	);
};
