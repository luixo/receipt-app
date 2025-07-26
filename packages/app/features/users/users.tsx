import type React from "react";

import { useSuspenseQuery } from "@tanstack/react-query";
import { Trans, useTranslation } from "react-i18next";

import { SkeletonUser, User } from "~app/components/app/user";
import { EmptyCard } from "~app/components/empty-card";
import {
	PaginationBlock,
	PaginationBlockSkeleton,
} from "~app/components/pagination-block";
import { SuspendedOverlay } from "~app/components/pagination-overlay";
import { suspendedFallback } from "~app/components/suspense-wrapper";
import { useCursorPaging } from "~app/hooks/use-cursor-paging";
import type { SearchParamState } from "~app/hooks/use-navigation";
import { useTRPC } from "~app/utils/trpc";
import { AddIcon } from "~components/icons";
import { ButtonLink, Link } from "~components/link";
import type { UsersId } from "~db/models";

const UserPreview = suspendedFallback<{
	id: UsersId;
}>(
	({ id }) => {
		const trpc = useTRPC();
		const { data: user } = useSuspenseQuery(
			trpc.users.get.queryOptions({ id }),
		);
		return (
			<Link to="/users/$id" params={{ id: user.id }}>
				<User
					id={user.id}
					name={user.name}
					connectedAccount={user.connectedAccount}
				/>
			</Link>
		);
	},
	<SkeletonUser className="self-start" />,
);

type Props = {
	limitState: SearchParamState<"/users", "offset">;
	offsetState: SearchParamState<"/users", "offset">;
};

export const Users: React.FC<Props> = suspendedFallback(
	({ limitState: [limit, setLimit], offsetState }) => {
		const { t } = useTranslation("users");
		const trpc = useTRPC();
		const { data, onPageChange, isPending } = useCursorPaging(
			trpc.users.getPaged,
			{ limit },
			offsetState,
		);

		if (!data.count) {
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

		return (
			<>
				<PaginationBlock
					totalCount={data.count}
					limit={limit}
					setLimit={setLimit}
					offset={offsetState[0]}
					onPageChange={onPageChange}
				/>
				<SuspendedOverlay isPending={isPending}>
					<>
						{data.items.map((id) => (
							<UserPreview key={id} id={id} />
						))}
					</>
				</SuspendedOverlay>
			</>
		);
	},
	({ limitState }) => (
		<>
			<PaginationBlockSkeleton limit={limitState[0]} />
			<SuspendedOverlay isPending>
				<>
					{Array.from({ length: limitState[0] }).map((_, index) => (
						// eslint-disable-next-line react/no-array-index-key
						<SkeletonUser key={index} className="self-start" />
					))}
				</>
			</SuspendedOverlay>
		</>
	),
);
