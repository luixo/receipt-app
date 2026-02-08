import type React from "react";

import { useTranslation } from "react-i18next";

import { AmountBadge } from "~app/components/amount-badge";
import { PageHeader } from "~app/components/page-header";
import { EmailVerificationCard } from "~app/features/email-verification/email-verification-card";
import { useConnectionIntentions } from "~app/hooks/use-connection-intentions";
import { useDefaultLimit } from "~app/hooks/use-default-limit";
import { getPathHooks } from "~app/utils/navigation";
import { Icon } from "~components/icons";
import { ButtonLink } from "~components/link";

import { Users } from "./users";

export const UsersScreen = () => {
	const { useQueryState, useDefaultedQueryState } =
		getPathHooks("/_protected/users/");
	const limitState = useDefaultedQueryState("limit", useDefaultLimit());
	const offsetState = useQueryState("offset");
	const { t } = useTranslation("users");
	return (
		<>
			<PageHeader
				startContent={<Icon name="users" className="size-9" />}
				aside={
					<>
						<ButtonLink
							to="/users/add"
							color="primary"
							title={t("list.addUser.button")}
							variant="bordered"
							isIconOnly
						>
							<Icon name="add" className="size-6" />
						</ButtonLink>
						<AmountBadge useAmount={useConnectionIntentions}>
							<ButtonLink
								key="connections"
								to="/users/connections"
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
			<Users limitState={limitState} offsetState={offsetState} />
		</>
	);
};
