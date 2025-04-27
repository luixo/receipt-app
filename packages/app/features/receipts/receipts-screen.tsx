import { z } from "zod";

import { PageHeader } from "~app/components/page-header";
import { EmailVerificationCard } from "~app/features/email-verification/email-verification-card";
import { useQueryState } from "~app/hooks/use-navigation";
import {
	parseAsInteger,
	parseAsJson,
	parseAsStringLiteral,
} from "~app/utils/navigation";
import { Button } from "~components/button";
import { AddIcon, ReceiptIcon } from "~components/icons";
import { Link } from "~components/link";
import type { AppPage } from "~utils/next";

import { FilterButton } from "./filter-button";
import { Receipts } from "./receipts";

const filtersSchema = z.strictObject({
	ownedByMe: z.boolean().optional(),
});
export type Filters = z.infer<typeof filtersSchema>;

const orderByLiterals = ["date-asc", "date-desc"] as const;
export type OrderByLiteral = (typeof orderByLiterals)[number];

const DEFAULT_LIMIT = 10;

export const ReceiptsScreen: AppPage = () => {
	const [orderBy, setOrderBy] = useQueryState(
		"sort",
		parseAsStringLiteral(orderByLiterals).withDefault("date-desc"),
	);
	const [filters, setFilters] = useQueryState(
		"filters",
		// eslint-disable-next-line @typescript-eslint/unbound-method
		parseAsJson(filtersSchema.parse).withDefault({}),
	);
	const [limit] = useQueryState(
		"limit",
		parseAsInteger.withDefault(DEFAULT_LIMIT),
	);
	return (
		<>
			<PageHeader
				startContent={<ReceiptIcon size={36} />}
				aside={
					<>
						<FilterButton
							filters={filters}
							setFilters={setFilters}
							orderBy={orderBy}
							setOrderBy={setOrderBy}
						/>
						<Button
							color="primary"
							href="/receipts/add"
							as={Link}
							title="Add receipt"
							variant="bordered"
							isIconOnly
						>
							<AddIcon size={24} />
						</Button>
					</>
				}
			>
				Receipts
			</PageHeader>
			<EmailVerificationCard />
			<Receipts filters={filters} orderBy={orderBy} limit={limit} />
		</>
	);
};
