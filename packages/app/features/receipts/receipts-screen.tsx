import type React from "react";

import { useTranslation } from "react-i18next";

import { PageHeader } from "~app/components/page-header";
import { EmailVerificationCard } from "~app/features/email-verification/email-verification-card";
import type { SearchParamState } from "~app/utils/navigation";
import { Icon } from "~components/icons";
import { ButtonLink } from "~components/link";

import { FilterButton } from "./filter-button";
import { Receipts } from "./receipts";

export const ReceiptsScreen: React.FC<{
	sortState: SearchParamState<"/receipts", "sort">;
	filtersState: SearchParamState<"/receipts", "filters">;
	limitState: SearchParamState<"/receipts", "limit">;
	offsetState: SearchParamState<"/receipts", "offset">;
}> = ({ sortState, filtersState, limitState, offsetState }) => {
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
