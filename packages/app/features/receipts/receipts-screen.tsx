import React from "react";

import { useTranslation } from "react-i18next";

import { PageHeader } from "~app/components/page-header";
import { PaginationBlockSkeleton } from "~app/components/pagination-block";
import { PaginationOverlay } from "~app/components/pagination-overlay";
import { EmailVerificationCard } from "~app/features/email-verification/email-verification-card";
import type { SearchParamState } from "~app/hooks/use-navigation";
import { AddIcon, ReceiptIcon } from "~components/icons";
import { ButtonLink } from "~components/link";

import { FilterButton } from "./filter-button";
import { ReceiptPreviewsSkeleton, Receipts } from "./receipts";

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
				startContent={<ReceiptIcon size={36} />}
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
							<AddIcon size={24} />
						</ButtonLink>
					</>
				}
			>
				{t("list.header")}
			</PageHeader>
			<EmailVerificationCard />
			<React.Suspense
				fallback={
					<PaginationOverlay
						pagination={<PaginationBlockSkeleton limit={limitState[0]} />}
						isPending
					>
						<ReceiptPreviewsSkeleton amount={limitState[0]} />
					</PaginationOverlay>
				}
			>
				<Receipts
					filters={filtersState[0]}
					sort={sortState[0]}
					limitState={limitState}
					offsetState={offsetState}
				/>
			</React.Suspense>
		</>
	);
};
