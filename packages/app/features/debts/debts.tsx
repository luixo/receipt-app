import type React from "react";

import { Trans, useTranslation } from "react-i18next";
import { isNonNullish, values } from "remeda";

import { EmptyCard } from "~app/components/empty-card";
import {
	PaginationBlock,
	PaginationBlockSkeleton,
} from "~app/components/pagination-block";
import { SuspendedOverlay } from "~app/components/pagination-overlay";
import { suspendedFallback } from "~app/components/suspense-wrapper";
import { useCursorPaging } from "~app/hooks/use-cursor-paging";
import { useShowResolvedDebts } from "~app/hooks/use-show-resolved-debts";
import type { SearchParamState } from "~app/utils/navigation";
import { useTRPC } from "~app/utils/trpc";
import { Icon } from "~components/icons";
import { ButtonLink } from "~components/link";
import { Text } from "~components/text";
import type { ViewReactNode } from "~components/view";
import { View } from "~components/view";

import {
	UserDebtsPreview,
	UserDebtsPreviewSkeleton,
} from "./user-debts-preview";

const DebtsWrapper: React.FC<{ children: ViewReactNode }> = ({ children }) => (
	<View className="gap-2">{children}</View>
);

type Props = {
	limitState: SearchParamState<"/debts", "limit">;
	offsetState: SearchParamState<"/debts", "offset">;
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
									// eslint-disable-next-line jsx-a11y/heading-has-content
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
							<UserDebtsPreview key={userId} userId={userId} />
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
						// eslint-disable-next-line react/no-array-index-key
						<UserDebtsPreviewSkeleton key={index} />
					))}
				</DebtsWrapper>
			</SuspendedOverlay>
		</>
	),
);
