import React from "react";

import { useSuspenseQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";

import {
	DebtsGroup,
	DebtsGroupSkeleton,
} from "~app/components/app/debts-group";
import { LoadableUser } from "~app/components/app/loadable-user";
import { PageHeader } from "~app/components/page-header";
import { suspendedFallback } from "~app/components/suspense-wrapper";
import { NavigationContext } from "~app/contexts/navigation-context";
import { ShowResolvedDebtsOption } from "~app/features/settings/show-resolved-debts-option";
import { User } from "~app/features/user/user";
import { useBooleanState } from "~app/hooks/use-boolean-state";
import { useShowResolvedDebts } from "~app/hooks/use-show-resolved-debts";
import { useTRPC } from "~app/utils/trpc";
import { BackLink } from "~components/back-link";
import { Button } from "~components/button";
import { Icon } from "~components/icons";
import { ButtonLink } from "~components/link";
import { Modal } from "~components/modal";
import { Text } from "~components/text";
import { View } from "~components/view";
import type { UserId } from "~db/ids";

import { UserDebtsList } from "./user-debts-list";

type HeaderProps = {
	userId: UserId;
};

const Header: React.FC<HeaderProps> = ({ userId }) => {
	const { t } = useTranslation("debts");
	const { useNavigate } = React.use(NavigationContext);
	const navigate = useNavigate();
	const [editModalOpen, { setTrue: openEditModal, setFalse: closeEditModal }] =
		useBooleanState();
	const onUserRemove = React.useCallback(() => {
		navigate({ to: "/debts", replace: true });
	}, [navigate]);
	return (
		<>
			<PageHeader
				startContent={<BackLink to="/debts" />}
				aside={
					<View className="flex flex-row gap-2">
						<Button
							isIconOnly
							variant="bordered"
							color="secondary"
							onPress={openEditModal}
						>
							<Icon name="pencil" className="size-6" />
						</Button>
						<ButtonLink
							to="/debts/transfer"
							search={{ from: userId }}
							color="primary"
							title={t("user.buttons.transfer")}
							variant="bordered"
							isIconOnly
						>
							<Icon name="transfer" className="size-6" />
						</ButtonLink>
						<ButtonLink
							color="primary"
							to="/debts/add"
							search={{ userId }}
							title={t("user.buttons.add")}
							variant="bordered"
							isIconOnly
						>
							<Icon name="add" className="size-6" />
						</ButtonLink>
					</View>
				}
				endContent={<LoadableUser id={userId} />}
			/>

			<Modal
				isOpen={editModalOpen}
				onOpenChange={closeEditModal}
				header={<Text className="text-xl">{t("user.modal.editTitle")}</Text>}
				bodyClassName="flex flex-col gap-4 py-6"
			>
				<User id={userId} onRemove={onUserRemove} />
			</Modal>
		</>
	);
};

const UserDebtsGroup = suspendedFallback<{
	userId: UserId;
}>(
	({ userId }) => {
		const trpc = useTRPC();
		const [showResolvedDebts] = useShowResolvedDebts();
		const { data: debts } = useSuspenseQuery(
			trpc.debts.getAllUser.queryOptions({ userId }),
		);
		const nonResolvedDebts = debts.filter((element) => element.sum !== 0);
		return (
			<View className="flex-row items-center justify-center gap-4 px-16">
				<DebtsGroup debts={showResolvedDebts ? debts : nonResolvedDebts} />
				{nonResolvedDebts.length > 1 ? (
					<ButtonLink
						color="primary"
						to="/debts/user/$id/exchange"
						params={{ id: userId }}
						variant="bordered"
						isIconOnly
					>
						<Icon name="exchange" />
					</ButtonLink>
				) : null}
				{debts.length !== nonResolvedDebts.length ? (
					<ShowResolvedDebtsOption className="absolute right-0" />
				) : null}
			</View>
		);
	},
	<View className="flex-row items-center justify-center">
		<DebtsGroupSkeleton amount={3} />
	</View>,
);

export const UserDebtsScreen: React.FC<
	{ userId: UserId } & Pick<
		React.ComponentProps<typeof UserDebtsList>,
		"offsetState" | "limitState"
	>
> = ({ userId, limitState, ...props }) => (
	<>
		<Header userId={userId} />
		<UserDebtsGroup userId={userId} />
		<UserDebtsList userId={userId} limitState={limitState} {...props} />
	</>
);
