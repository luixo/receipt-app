import type React from "react";

import { useQueries } from "@tanstack/react-query";
import { Trans, useTranslation } from "react-i18next";

import { SkeletonUser } from "~app/components/app/user";
import { EmptyCard } from "~app/components/empty-card";
import { QueryErrorMessage } from "~app/components/error-message";
import { PaginationBlock } from "~app/components/pagination-block";
import { useCursorPaging } from "~app/hooks/use-cursor-paging";
import type { SearchParamState } from "~app/hooks/use-navigation";
import type { TRPCQueryErrorResult } from "~app/trpc";
import { useTRPC } from "~app/utils/trpc";
import { AddIcon } from "~components/icons";
import { ButtonLink } from "~components/link";
import { Overlay } from "~components/overlay";
import { Spinner } from "~components/spinner";
import type { UsersId } from "~db/models";

import { UserPreview } from "./user-preview";

const UserPreviews: React.FC<{ ids: UsersId[] }> = ({ ids }) => {
	const trpc = useTRPC();
	const userQueries = useQueries({
		queries: ids.map((id) => trpc.users.get.queryOptions({ id })),
	});
	if (userQueries.every((query) => query.status === "pending")) {
		return <Spinner size="lg" />;
	}
	if (userQueries.every((query) => query.status === "error")) {
		return (
			<QueryErrorMessage
				query={userQueries[0] as TRPCQueryErrorResult<"users.get">}
			/>
		);
	}

	return (
		<>
			{userQueries.map((userQuery, index) =>
				userQuery.status === "pending" ? (
					<SkeletonUser key={ids[index]} className="self-start" />
				) : userQuery.status === "error" ? (
					<QueryErrorMessage key={ids[index]} query={userQuery} />
				) : (
					<UserPreview key={ids[index]} user={userQuery.data} />
				),
			)}
		</>
	);
};

type Props = {
	limitState: SearchParamState<"/users", "offset">;
	offsetState: SearchParamState<"/users", "offset">;
};

export const Users: React.FC<Props> = ({
	limitState: [limit, setLimit],
	offsetState,
}) => {
	const { t } = useTranslation("users");
	const trpc = useTRPC();
	const { totalCount, pagination, query } = useCursorPaging(
		trpc.users.getPaged,
		{ limit },
		offsetState,
	);

	if (!totalCount && query.fetchStatus !== "fetching") {
		return (
			<EmptyCard title={t("list.empty.title")}>
				<Trans
					t={t}
					i18nKey="list.empty.message"
					components={{
						icon: (
							<ButtonLink
								color="primary"
								to="/users/add"
								title={t("list.addUser.button")}
								variant="bordered"
								className="mx-2"
								isIconOnly
							>
								<AddIcon size={24} />
							</ButtonLink>
						),
					}}
				/>
			</EmptyCard>
		);
	}

	const paginationElement = (
		<PaginationBlock
			totalCount={totalCount}
			limit={limit}
			setLimit={setLimit}
			props={pagination}
		/>
	);

	return (
		<>
			{paginationElement}
			<Overlay
				className="gap-2"
				overlay={
					query.fetchStatus === "fetching" ? <Spinner size="lg" /> : undefined
				}
			>
				{query.status === "error" ? <QueryErrorMessage query={query} /> : null}
				{query.status === "pending" ? (
					<Spinner size="lg" />
				) : query.data ? (
					<UserPreviews ids={query.data.items} />
				) : null}
			</Overlay>
			{paginationElement}
		</>
	);
};
