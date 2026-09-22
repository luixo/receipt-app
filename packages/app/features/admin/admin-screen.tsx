import React from "react";

import { useSuspenseQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";

import { Peer, SkeletonPeer } from "~app/components/app/peer";
import { PageHeader } from "~app/components/page-header";
import { suspendedFallback } from "~app/components/suspense-wrapper";
import { StoreDataContext } from "~app/contexts/store-data-context";
import type { TRPCQueryOutput } from "~app/trpc";
import { PRETEND_ACCOUNT_STORE_NAME } from "~app/utils/store/pretend-account";
import { useTRPC } from "~app/utils/trpc";
import { Button } from "~components/button";
import { Card } from "~components/card";
import { Divider } from "~components/divider";
import { Modal } from "~components/modal";
import { Skeleton } from "~components/skeleton";
import { Text } from "~components/text";
import type { ViewReactNode } from "~components/view";
import { View } from "~components/view";
import type { PeerId } from "~db/ids";

type ModalProps = {
	isModalOpen: boolean;
	closeModal: () => void;
	email: string;
	setMockedEmail: (email: string) => void;
};

const BecomeModal: React.FC<ModalProps> = ({
	isModalOpen,
	closeModal,
	email,
	setMockedEmail,
}) => {
	const { t } = useTranslation("admin");
	const becomeAccount = React.useCallback(() => {
		setMockedEmail(email);
		closeModal();
	}, [setMockedEmail, closeModal, email]);
	return (
		<Modal
			isOpen={isModalOpen}
			onOpenChange={closeModal}
			header={<Text variant="h3">{t("pretend.modal.title", { email })}</Text>}
			bodyClassName="flex-row gap-4 p-4"
		>
			<Button color="warning" onPress={becomeAccount} className="flex-1">
				{t("pretend.modal.yes")}
			</Button>
			<Button color="default" onPress={closeModal} className="flex-1">
				{t("pretend.modal.no")}
			</Button>
		</Modal>
	);
};

const SkeletonAdminAccountCard: React.FC = () => (
	<Card bodyClassName="flex-row items-start justify-between">
		<SkeletonPeer />
	</Card>
);

const AdminAccountCard: React.FC<
	TRPCQueryOutput<"admin.accounts">["items"][number] & {
		children?: ViewReactNode;
	}
> = ({ peer, account, children }) => (
	<Card bodyClassName="flex-row items-start justify-between">
		<Peer
			id={peer ? peer.id : (account.id as PeerId)}
			name={peer ? peer.name : account.email}
			connectedAccount={account}
			avatarProps={{ dimmed: !peer }}
		/>
		<View>{children}</View>
	</Card>
);

const AdminCard = suspendedFallback(
	() => {
		const trpc = useTRPC();
		const { data: account } = useSuspenseQuery(trpc.account.get.queryOptions());
		return (
			<AdminAccountCard
				peer={{
					...account.peer,
					// Typesystem doesn't know that we use account id as self peer id;
					id: account.account.id as PeerId,
				}}
				account={account.account}
			/>
		);
	},
	<Skeleton className="h-8 w-60 rounded-sm" />,
);

const AdminScreenInner = suspendedFallback(
	() => {
		const { t } = useTranslation("admin");
		const trpc = useTRPC();
		const { data: accounts } = useSuspenseQuery(
			trpc.admin.accounts.queryOptions(),
		);
		const [modalEmail, setModalEmail] = React.useState<string | undefined>();
		const {
			[PRETEND_ACCOUNT_STORE_NAME]: [
				pretendAccount,
				setPretendAccount,
				resetPretendAccount,
			],
		} = React.use(StoreDataContext);
		const setPretendEmail = React.useCallback(
			(email: string) => setPretendAccount({ email }),
			[setPretendAccount],
		);
		const closeModal = React.useCallback(() => setModalEmail(undefined), []);
		const setModalEmailCurried = React.useCallback(
			(email: string) => () => {
				setModalEmail(email);
			},
			[],
		);
		const pretendAccountAccount = pretendAccount.email
			? accounts.items.find(
					(element) => element.account.email === pretendAccount.email,
				)
			: null;
		return (
			<View className="flex flex-col items-stretch gap-2">
				{pretendAccountAccount ? (
					<>
						<AdminAccountCard {...pretendAccountAccount} />
						<Button onPress={resetPretendAccount} color="primary">
							{t("pretend.resetToSelfButton")}
						</Button>
					</>
				) : (
					<AdminCard />
				)}
				<Divider />
				{accounts.items
					.filter((element) => pretendAccount.email !== element.account.email)
					.map((element) => (
						<AdminAccountCard key={element.account.id} {...element}>
							<Button
								onPress={setModalEmailCurried(element.account.email)}
								color="warning"
							>
								{t("pretend.becomeButton")}
							</Button>
						</AdminAccountCard>
					))}
				<BecomeModal
					isModalOpen={Boolean(modalEmail)}
					closeModal={closeModal}
					email={modalEmail || "unknown"}
					setMockedEmail={setPretendEmail}
				/>
			</View>
		);
	},
	<View className="flex flex-col items-stretch gap-2 px-1 py-3">
		<SkeletonAdminAccountCard />
		<Divider />
		<SkeletonAdminAccountCard />
		<SkeletonAdminAccountCard />
		<SkeletonAdminAccountCard />
	</View>,
);

export const AdminScreen = () => {
	const { t } = useTranslation("admin");
	return (
		<>
			<PageHeader>{t("pageHeader")}</PageHeader>
			<View>
				<AdminScreenInner />
			</View>
		</>
	);
};
