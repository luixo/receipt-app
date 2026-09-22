import React from "react";

import { useSuspenseQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";

import { DebtsGroupSkeleton } from "~app/components/app/debts-group";
import { LoadablePeer } from "~app/components/app/loadable-peer";
import { PageHeader } from "~app/components/page-header";
import { PeerDebtsGroup } from "~app/components/peer-debts-group";
import { suspendedFallback } from "~app/components/suspense-wrapper";
import { NavigationContext } from "~app/contexts/navigation-context";
import { Peer } from "~app/features/peer/peer";
import { ShowResolvedDebtsOption } from "~app/features/settings/show-resolved-debts-option";
import { useBooleanState } from "~app/hooks/use-boolean-state";
import { useDefaultLimit } from "~app/hooks/use-default-limit";
import { getPathHooks } from "~app/utils/navigation";
import { useTRPC } from "~app/utils/trpc";
import { BackLink } from "~components/back-link";
import { Button } from "~components/button";
import { Icon } from "~components/icons";
import { ButtonLink } from "~components/link";
import { Modal } from "~components/modal";
import { Text } from "~components/text";
import { View } from "~components/view";
import type { PeerId } from "~db/ids";

import { PeerDebtsList } from "./peer-debts-list";

type HeaderProps = {
	peerId: PeerId;
};

const Header: React.FC<HeaderProps> = ({ peerId }) => {
	const { t } = useTranslation("debts");
	const { useNavigate } = React.use(NavigationContext);
	const navigate = useNavigate();
	const [editModalOpen, { setTrue: openEditModal, setFalse: closeEditModal }] =
		useBooleanState();
	const onPeerRemove = React.useCallback(() => {
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
							aria-label="Edit peer"
						>
							<Icon name="pencil" className="size-6" />
						</Button>
						<ButtonLink
							to="/debts/transfer"
							search={{ from: peerId }}
							color="primary"
							title={t("peer.buttons.transfer")}
							variant="bordered"
							isIconOnly
						>
							<Icon name="transfer" className="size-6" />
						</ButtonLink>
						<ButtonLink
							color="primary"
							to="/debts/add"
							search={{ peerId }}
							title={t("peer.buttons.add")}
							variant="bordered"
							isIconOnly
						>
							<Icon name="add" className="size-6" />
						</ButtonLink>
					</View>
				}
				endContent={<LoadablePeer id={peerId} />}
			/>

			<Modal
				isOpen={editModalOpen}
				onOpenChange={closeEditModal}
				header={<Text className="text-xl">{t("peer.modal.editTitle")}</Text>}
				bodyClassName="flex flex-col gap-4 py-6"
				label={t("peer.modal.editTitle")}
			>
				<Peer id={peerId} onRemove={onPeerRemove} />
			</Modal>
		</>
	);
};

const PeerDebtsGroupWithButtons = suspendedFallback<{
	peerId: PeerId;
}>(
	({ peerId }) => {
		const trpc = useTRPC();
		const { data: debts } = useSuspenseQuery(
			trpc.debts.getAllPeer.queryOptions({ peerId }),
		);
		const nonResolvedDebts = debts.items.filter((element) => element.sum !== 0);
		return (
			<View className="flex-row items-center justify-center gap-4 px-16">
				<PeerDebtsGroup peerId={peerId} />
				{nonResolvedDebts.length === 0 ? null : (
					<ButtonLink
						color="primary"
						to="/debts/peer/$id/exchange"
						params={{ id: peerId }}
						variant="bordered"
						isIconOnly
					>
						<Icon name="exchange" />
					</ButtonLink>
				)}
				{nonResolvedDebts.length === debts.items.length ? null : (
					<ShowResolvedDebtsOption className="absolute right-0" />
				)}
			</View>
		);
	},
	<View className="flex-row items-center justify-center">
		<DebtsGroupSkeleton amount={3} />
	</View>,
);

export const PeerDebtsScreen = () => {
	const { useParams, useQueryState, useDefaultedQueryState } = getPathHooks(
		"/_protected/debts/peer/$id/",
	);
	const { id: peerId } = useParams();
	const limitState = useDefaultedQueryState("limit", useDefaultLimit());
	const offsetState = useQueryState("offset");
	return (
		<>
			<Header peerId={peerId} />
			<PeerDebtsGroupWithButtons peerId={peerId} />
			<PeerDebtsList
				peerId={peerId}
				limitState={limitState}
				offsetState={offsetState}
			/>
		</>
	);
};
