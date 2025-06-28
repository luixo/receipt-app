import type React from "react";

import { PageHeader } from "~app/components/page-header";
import { EmailVerificationCard } from "~app/features/email-verification/email-verification-card";
import type { SearchParamState } from "~app/hooks/use-navigation";
import { AddIcon, ReceiptIcon } from "~components/icons";
import { ButtonLink } from "~components/link";

import { FilterButton } from "./filter-button";
import { Receipts } from "./receipts";

export const ReceiptsScreen: React.FC<{
	sortState: SearchParamState<"/receipts", "sort">;
	filtersState: SearchParamState<"/receipts", "filters">;
	limitState: SearchParamState<"/receipts", "limit">;
	offsetState: SearchParamState<"/receipts", "offset">;
}> = ({ sortState, filtersState, limitState, offsetState }) => (
	<>
		<PageHeader
			startContent={<ReceiptIcon size={36} />}
			aside={
				<>
					<FilterButton filtersState={filtersState} sortState={sortState} />
					<ButtonLink
						color="primary"
						to="/receipts/add"
						title="Add receipt"
						variant="bordered"
						isIconOnly
					>
						<AddIcon size={24} />
					</ButtonLink>
				</>
			}
		>
			Receipts
		</PageHeader>
		<EmailVerificationCard />
		<Receipts
			filters={filtersState[0]}
			sort={sortState[0]}
			limit={limitState[0]}
			offsetState={offsetState}
		/>
	</>
);
