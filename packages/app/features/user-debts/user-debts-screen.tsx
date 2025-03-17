import React from "react";
import { View } from "react-native";

import { useParams, useRouter } from "solito/navigation";

import {
	DebtsGroup,
	DebtsGroupSkeleton,
} from "~app/components/app/debts-group";
import { LoadableUser } from "~app/components/app/loadable-user";
import { QueryErrorMessage } from "~app/components/error-message";
import { PageHeader } from "~app/components/page-header";
import { ShowResolvedDebtsOption } from "~app/features/settings/show-resolved-debts-option";
import { User } from "~app/features/user/user";
import { EvenDebtsDivider } from "~app/features/user-debts/even-debts-divider";
import { useAggregatedDebts } from "~app/hooks/use-aggregated-debts";
import { useBooleanState } from "~app/hooks/use-boolean-state";
import { useDebtsWithDividers } from "~app/hooks/use-debts-with-dividers";
import { useDividers } from "~app/hooks/use-dividers";
import { useShowResolvedDebts } from "~app/hooks/use-show-resolved-debts";
import type { TRPCQuerySuccessResult } from "~app/trpc";
import { trpc } from "~app/trpc";
import { Button } from "~components/button";
import { Divider } from "~components/divider";
import { AddIcon, ExchangeIcon, PencilIcon } from "~components/icons";
import { Link } from "~components/link";
import { Modal, ModalBody, ModalContent, ModalHeader } from "~components/modal";
import { Text } from "~components/text";
import type { UsersId } from "~db/models";
import type { AppPage } from "~utils/next";

import { UserDebtPreview, UserDebtPreviewSkeleton } from "./user-debt-preview";

type HeaderProps = {
	title: string;
	userId: UsersId;
	onEditClick?: () => void;
};

const Header: React.FC<HeaderProps> = ({ title, userId, onEditClick }) => (
	<PageHeader
		backHref="/debts"
		title={title}
		aside={
			<View className="flex flex-row gap-2">
				{onEditClick ? (
					<Button
						isIconOnly
						variant="bordered"
						color="secondary"
						onClick={onEditClick}
					>
						<PencilIcon size={32} />
					</Button>
				) : null}
				<Button
					color="primary"
					href={`/debts/add?userId=${userId}`}
					as={Link}
					title="Add debt"
					variant="bordered"
					isIconOnly
				>
					<AddIcon size={24} />
				</Button>
			</View>
		}
	>
		<LoadableUser id={userId} />
	</PageHeader>
);

type InnerProps = {
	userId: UsersId;
	query: TRPCQuerySuccessResult<"debts.getIdsByUser">;
};

export const UserDebtsInner: React.FC<InnerProps> = ({ userId, query }) => {
	const router = useRouter();
	const [showResolvedDebts, setShowResolvedDebts] = useShowResolvedDebts();
	const enableShowResolvedDebts = React.useCallback(
		() => setShowResolvedDebts(true),
		[setShowResolvedDebts],
	);
	const [
		aggregatedDebts,
		nonZeroAggregatedDebts,
		aggregatedDebtsLoading,
		aggregatedDebtsErrorQueries,
	] = useAggregatedDebts(query);
	const debtIds = query.data.map((debt) => debt.id);
	const debtsQueries = trpc.useQueries((t) =>
		debtIds.map((debtId) => t.debts.get({ id: debtId })),
	);
	const successDebtsQueries = debtsQueries.filter(
		(debtQuery) => debtQuery.status === "success",
	);
	const userQuery = trpc.users.get.useQuery({ id: userId });
	const allSuccessQueries = React.useMemo(
		() =>
			successDebtsQueries.length === debtsQueries.length
				? successDebtsQueries.map((successfulQuery) => successfulQuery.data)
				: [],
		[debtsQueries.length, successDebtsQueries],
	);
	const dividers = useDividers(allSuccessQueries, aggregatedDebts);
	const debts = useDebtsWithDividers(debtIds, allSuccessQueries, dividers);
	const [editModalOpen, { setTrue: openEditModal, setFalse: closeEditModal }] =
		useBooleanState();
	const onUserRemove = React.useCallback(() => {
		router.replace("/debts");
	}, [router]);
	return (
		<>
			<Header
				userId={userId}
				title={`${
					userQuery.status === "success" ? userQuery.data.name : "..."
				}'s debts`}
				onEditClick={openEditModal}
			/>
			<View className="flex-row items-center justify-center gap-4 px-16">
				<DebtsGroup
					isLoading={aggregatedDebtsLoading}
					errorQueries={aggregatedDebtsErrorQueries}
					debts={showResolvedDebts ? aggregatedDebts : nonZeroAggregatedDebts}
				/>
				{nonZeroAggregatedDebts.length > 1 ? (
					<Button
						color="primary"
						href={`/debts/user/${userId}/exchange/`}
						as={Link}
						variant="bordered"
						isIconOnly
					>
						<ExchangeIcon />
					</Button>
				) : null}
				{aggregatedDebts.length !== nonZeroAggregatedDebts.length ||
				dividers.length !== 0 ? (
					<ShowResolvedDebtsOption className="absolute right-0" />
				) : null}
			</View>
			<View className="gap-2">
				{debts.map((debt) => (
					<React.Fragment key={debt.id}>
						{debt.dividerCurrencyCode ? (
							<>
								<Divider />
								<EvenDebtsDivider currencyCode={debt.dividerCurrencyCode} />
							</>
						) : null}
						<Divider />
						<UserDebtPreview debtId={debt.id} />
					</React.Fragment>
				))}
			</View>
			{showResolvedDebts || dividers.length === 0 ? null : (
				<View className="flex items-center">
					<Button
						variant="bordered"
						color="primary"
						onPress={enableShowResolvedDebts}
					>
						Show resolved debts
					</Button>
				</View>
			)}
			<Modal isOpen={editModalOpen} onOpenChange={closeEditModal}>
				<ModalContent>
					<ModalHeader>
						<Text className="text-xl">Edit user</Text>
					</ModalHeader>
					<ModalBody className="flex flex-col gap-4 py-6">
						<User id={userId} onRemove={onUserRemove} />
					</ModalBody>
				</ModalContent>
			</Modal>
		</>
	);
};

export const UserDebtsScreen: AppPage = () => {
	const { id: userId } = useParams<{ id: string }>();
	const query = trpc.debts.getIdsByUser.useQuery({ userId });
	const elements = React.useMemo(() => new Array<null>(3).fill(null), []);
	if (query.status === "pending") {
		return (
			<>
				<Header userId={userId} title="Loading debts..." />
				<View className="flex-row items-center justify-center">
					<DebtsGroupSkeleton amount={3} />
				</View>
				<View className="gap-2">
					{elements.map((_, index) => (
						// eslint-disable-next-line react/no-array-index-key
						<React.Fragment key={index}>
							<Divider />
							<UserDebtPreviewSkeleton />
						</React.Fragment>
					))}
				</View>
			</>
		);
	}
	if (query.status === "error") {
		return <QueryErrorMessage query={query} />;
	}
	return <UserDebtsInner query={query} userId={userId} />;
};
