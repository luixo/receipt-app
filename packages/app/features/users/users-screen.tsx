import type React from "react";

import { useTranslation } from "react-i18next";

import { AmountBadge } from "~app/components/amount-badge";
import { PageHeader } from "~app/components/page-header";
import { EmailVerificationCard } from "~app/features/email-verification/email-verification-card";
import { useConnectionIntentions } from "~app/hooks/use-connection-intentions";
import type {
	SearchParamState,
	SearchParamStateDefaulted,
} from "~app/hooks/use-navigation";
import { Icon } from "~components/icons";
import { ButtonLink } from "~components/link";

import { Users } from "./users";

export const UsersScreen: React.FC<{
	limitState: SearchParamStateDefaulted<"/users", "limit", number>;
	offsetState: SearchParamState<"/users", "offset">;
}> = ({ limitState, offsetState }) => {
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
