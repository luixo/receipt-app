import type React from "react";

import { useSuspenseQuery } from "@tanstack/react-query";
import { Trans, useTranslation } from "react-i18next";
import { isNonNullish, values } from "remeda";

import { DebtsGroupSkeleton } from "~app/components/app/debts-group";
import { LoadableUser } from "~app/components/app/loadable-user";
import { SkeletonUser } from "~app/components/app/user";
import { EmptyCard } from "~app/components/empty-card";
import {
	PaginationBlock,
	PaginationBlockSkeleton,
} from "~app/components/pagination-block";
import { SuspendedOverlay } from "~app/components/pagination-overlay";
import { suspendedFallback } from "~app/components/suspense-wrapper";
import { UserDebtsGroup } from "~app/components/user-debts-group";
import { useCursorPaging } from "~app/hooks/use-cursor-paging";
import { useShowResolvedDebts } from "~app/hooks/use-show-resolved-debts";
import type {
	SearchParamState,
	SearchParamStateDefaulted,
} from "~app/utils/navigation";
import { useTRPC } from "~app/utils/trpc";
import { Card } from "~components/card";
import { Icon } from "~components/icons";
import { ButtonLink, CardLink } from "~components/link";
import { Text } from "~components/text";
import type { ViewReactNode } from "~components/view";
import { View } from "~components/view";
import type { UserId } from "~db/ids";

const cardClassName =
	"flex flex-row flex-wrap items-end justify-between gap-4 md:flex-row md:items-center";

const DebtsWrapper: React.FC<{ children: ViewReactNode }> = ({ children }) => (
	<View className="gap-2">{children}</View>
);

const UserDebtsCard: React.FC<{ userId: UserId }> = ({ userId }) => {
	const trpc = useTRPC();
	const { data: debts } = useSuspenseQuery(
		trpc.debts.getAllUser.queryOptions({ userId }),
	);
	const [showResolvedDebts] = useShowResolvedDebts();
	if (
		debts.items.filter((item) => item.sum !== 0).length === 0 &&
		!showResolvedDebts
	) {
		return null;
	}
	return (
		<CardLink
			to="/debts/user/$id"
			params={{ id: userId }}
			bodyClassName={cardClassName}
			testID="user-debts-preview"
		>
			<LoadableUser id={userId} />
			<View className="flex flex-row items-center justify-center gap-2">
				<UserDebtsGroup userId={userId} className="shrink-0" />
			</View>
		</CardLink>
	);
};

type Props = {
	limitState: SearchParamStateDefaulted<"/_protected/debts/", "limit">;
	offsetState: SearchParamState<"/_protected/debts/", "offset">;
};

export const Debts = suspendedFallback<Props>(
	({ limitState, offsetState }) => {
		const { t } = useTranslation("debts");
		const [showResolvedDebts] = useShowResolvedDebts();
		const [limit, setLimit] = limitState;
		const filters = {};
		const trpc = useTRPC();
		const { data, onPageChange, isPending } = useCursorPaging(
			trpc.debts.getUsersPaged,
			{ limit, filters: { showResolved: showResolvedDebts, ...filters } },
			offsetState,
		);

		if (!data.count) {
			if (values(filters).filter(isNonNullish).length === 0) {
				return (
					<Text variant="h3" className="text-center">
						{t("list.filters.noResults")}
					</Text>
				);
			}
			return (
				<EmptyCard title={t("list.empty.title")}>
					<View className="items-center gap-4">
						<View className="flex-row items-center">
							<Trans
								t={t}
								i18nKey="list.empty.description"
								components={{
									text: <Text className="text-xl" />,
									button: (
										<ButtonLink
											to="/debts/add"
											color="primary"
											title={t("list.buttons.add")}
											variant="bordered"
											isIconOnly
											className="mx-2"
										>
											<Icon name="add" className="size-6" />
										</ButtonLink>
									),
								}}
							/>
						</View>
					</View>
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
					<DebtsWrapper>
						{data.items.map((userId) => (
							<UserDebtsCard key={userId} userId={userId} />
						))}
					</DebtsWrapper>
				</SuspendedOverlay>
			</>
		);
	},
	({ limitState }) => (
		<>
			<PaginationBlockSkeleton limit={limitState[0]} />
			<SuspendedOverlay isPending>
				<DebtsWrapper>
					{Array.from({ length: limitState[0] }).map((_, index) => (
						<Card
							// oxlint-disable-next-line react/no-array-index-key
							key={index}
							bodyClassName={cardClassName}
						>
							<SkeletonUser />
							<View className="flex flex-row items-center justify-center gap-2">
								<DebtsGroupSkeleton className="shrink-0" amount={3} />
							</View>
						</Card>
					))}
				</DebtsWrapper>
			</SuspendedOverlay>
		</>
	),
);
