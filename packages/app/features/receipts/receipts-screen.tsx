import type React from "react";

import { useTranslation } from "react-i18next";

import { PageHeader } from "#app/components/page-header.tsx";
import { EmailVerificationCard } from "#app/features/email-verification/email-verification-card.tsx";
import { useDefaultLimit } from "#app/hooks/use-default-limit.ts";
import { getPathHooks } from "#app/utils/navigation.tsx";
import { Icon } from "#components/icons.tsx";
import { ButtonLink } from "#components/link.tsx";

import { FilterButton } from "./filter-button";
import { Receipts } from "./receipts";

export const ReceiptsScreen = () => {
	const { useQueryState, useDefaultedQueryState } = getPathHooks(
		"/_protected/receipts/",
	);
	const sortState = useQueryState("sort");
	const filtersState = useQueryState("filters");
	const limitState = useDefaultedQueryState("limit", useDefaultLimit());
	const offsetState = useQueryState("offset");
	const { t } = useTranslation("receipts");
	return (
		<>
			<PageHeader
				startContent={<Icon name="receipt" className="size-9" />}
				aside={
					<>
						<FilterButton filtersState={filtersState} sortState={sortState} />
						<ButtonLink
							color="primary"
							to="/receipts/add"
							title={t("list.addButton")}
							variant="bordered"
							isIconOnly
						>
							<Icon name="add" className="size-6" />
						</ButtonLink>
					</>
				}
			>
				{t("list.header")}
			</PageHeader>
			<EmailVerificationCard />
			<Receipts
				filtersState={filtersState}
				sort={sortState[0]}
				limitState={limitState}
				offsetState={offsetState}
			/>
		</>
	);
};
