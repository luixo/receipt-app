import React from "react";

import { useSuspenseQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";

import { Peer, SkeletonPeer } from "#app/components/app/peer.tsx";
import { PageHeader } from "#app/components/page-header.tsx";
import { suspendedFallback } from "#app/components/suspense-wrapper.tsx";
import { StoreDataContext } from "#app/contexts/store-data-context.ts";
import type { TRPCQueryOutput } from "#app/trpc.ts";
import { PRETEND_USER_STORE_NAME } from "#app/utils/store/pretend-user.ts";
import { useTRPC } from "#app/utils/trpc.ts";
import { Button } from "#components/button.tsx";
import { Card } from "#components/card.tsx";
import { Divider } from "#components/divider.tsx";
import { Modal } from "#components/modal.tsx";
import { Skeleton } from "#components/skeleton.tsx";
import { Text } from "#components/text.tsx";
import type { ViewReactNode } from "#components/view.tsx";
import { View } from "#components/view.tsx";
import type { PeerId } from "#db/ids.ts";

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
	const becomeUser = React.useCallback(() => {
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
			<Button color="warning" onPress={becomeUser} className="flex-1">
				{t("pretend.modal.yes")}
			</Button>
			<Button color="default" onPress={closeModal} className="flex-1">
				{t("pretend.modal.no")}
			</Button>
		</Modal>
	);
};

const SkeletonAdminUserCard: React.FC = () => (
	<Card bodyClassName="flex-row items-start justify-between">
		<SkeletonPeer />
	</Card>
);

const AdminUserCard: React.FC<
	TRPCQueryOutput<"admin.users">["items"][number] & {
		children?: ViewReactNode;
	}
> = ({ peer, user, children }) => (
	<Card bodyClassName="flex-row items-start justify-between">
		<Peer
			id={peer ? peer.id : (user.id as PeerId)}
			name={peer ? peer.name : user.email}
			connectedUser={user}
			avatarProps={{ dimmed: !peer }}
		/>
		<View>{children}</View>
	</Card>
);

const AdminCard = suspendedFallback(
	() => {
		const trpc = useTRPC();
		const { data: user } = useSuspenseQuery(trpc.user.get.queryOptions());
		return (
			<AdminUserCard
				peer={{
					...user.peer,
					// Typesystem doesn't know that we use  user id as self peer id;
					id: user.user.id as PeerId,
				}}
				user={user.user}
			/>
		);
	},
	<Skeleton className="h-8 w-60 rounded-sm" />,
);

const AdminScreenInner = suspendedFallback(
	() => {
		const { t } = useTranslation("admin");
		const trpc = useTRPC();
		const { data: users } = useSuspenseQuery(trpc.admin.users.queryOptions());
		const [modalEmail, setModalEmail] = React.useState<string | undefined>();
		const {
			[PRETEND_USER_STORE_NAME]: [
				pretendUser,
				setPretendUser,
				resetPretendUser,
			],
		} = React.use(StoreDataContext);
		const setPretendEmail = React.useCallback(
			(email: string) => setPretendUser({ email }),
			[setPretendUser],
		);
		const closeModal = React.useCallback(() => setModalEmail(undefined), []);
		const setModalEmailCurried = React.useCallback(
			(email: string) => () => {
				setModalEmail(email);
			},
			[],
		);
		const pretendUserUser = pretendUser.email
			? users.items.find((element) => element.user.email === pretendUser.email)
			: null;
		return (
			<View className="flex flex-col items-stretch gap-2">
				{pretendUserUser ? (
					<>
						<AdminUserCard {...pretendUserUser} />
						<Button onPress={resetPretendUser} color="primary">
							{t("pretend.resetToSelfButton")}
						</Button>
					</>
				) : (
					<AdminCard />
				)}
				<Divider />
				{users.items
					.filter((element) => pretendUser.email !== element.user.email)
					.map((element) => (
						<AdminUserCard key={element.user.id} {...element}>
							<Button
								onPress={setModalEmailCurried(element.user.email)}
								color="warning"
							>
								{t("pretend.becomeButton")}
							</Button>
						</AdminUserCard>
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
		<SkeletonAdminUserCard />
		<Divider />
		<SkeletonAdminUserCard />
		<SkeletonAdminUserCard />
		<SkeletonAdminUserCard />
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
