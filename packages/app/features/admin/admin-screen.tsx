import React from "react";

import { useSuspenseQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";

import { SkeletonUser, User } from "~app/components/app/user";
import { PageHeader } from "~app/components/page-header";
import { suspendedFallback } from "~app/components/suspense-wrapper";
import { StoreDataContext } from "~app/contexts/store-data-context";
import type { TRPCQueryOutput } from "~app/trpc";
import { PRETEND_USER_STORE_NAME } from "~app/utils/store/pretend-user";
import { useTRPC } from "~app/utils/trpc";
import { Button } from "~components/button";
import { Card, CardBody } from "~components/card";
import { Divider } from "~components/divider";
import { Header } from "~components/header";
import { Modal, ModalBody, ModalContent, ModalHeader } from "~components/modal";
import { Skeleton } from "~components/skeleton";
import { Tab, Tabs, TabsSkeleton } from "~components/tabs";
import type { UsersId } from "~db/models";

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
		<Modal isOpen={isModalOpen} onOpenChange={closeModal}>
			<ModalContent>
				<ModalHeader>
					<Header>{t("pretend.modal.title", { email })}</Header>
				</ModalHeader>
				<ModalBody className="flex-row gap-4 p-4">
					<Button color="warning" onPress={becomeAccount} className="flex-1">
						{t("pretend.modal.yes")}
					</Button>
					<Button color="default" onPress={closeModal} className="flex-1">
						{t("pretend.modal.no")}
					</Button>
				</ModalBody>
			</ModalContent>
		</Modal>
	);
};

const SkeletonAdminUserCard: React.FC<React.PropsWithChildren> = ({
	children,
}) => (
	<Card>
		<CardBody className="flex-row items-start justify-between">
			<SkeletonUser />
			<div>{children}</div>
		</CardBody>
	</Card>
);

const AdminUserCard: React.FC<
	React.PropsWithChildren<TRPCQueryOutput<"admin.accounts">[number]>
> = ({ user, account, children }) => (
	<Card>
		<CardBody className="flex-row items-start justify-between">
			<User
				id={user ? user.id : (account.id as UsersId)}
				name={user ? user.name : account.email}
				connectedAccount={account}
				dimmed={!user}
			/>
			<div>{children}</div>
		</CardBody>
	</Card>
);

const AdminCard = suspendedFallback(
	() => {
		const trpc = useTRPC();
		const { data: account } = useSuspenseQuery(trpc.account.get.queryOptions());
		return (
			<AdminUserCard
				user={{
					...account.user,
					// Typesystem doesn't know that we use account id as self user id;
					id: account.account.id as UsersId,
				}}
				account={account.account}
			/>
		);
	},
	<Skeleton className="h-8 w-60 rounded" />,
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
		const pretendUserAccount = pretendUser.email
			? accounts.find((element) => element.account.email === pretendUser.email)
			: null;
		return (
			<Tabs variant="underlined">
				<Tab key="become" title={t("pretend.tabName")}>
					<div className="flex flex-col items-stretch gap-2">
						{pretendUserAccount ? (
							<>
								<AdminUserCard {...pretendUserAccount} />
								<Button onPress={resetPretendUser} color="primary">
									{t("pretend.resetToSelfButton")}
								</Button>
							</>
						) : (
							<AdminCard />
						)}
						<Divider />
						{accounts
							.filter((element) => pretendUser.email !== element.account.email)
							.map((element) => (
								<AdminUserCard key={element.account.id} {...element}>
									<Button
										onPress={setModalEmailCurried(element.account.email)}
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
					</div>
				</Tab>
			</Tabs>
		);
	},
	<TabsSkeleton
		tabsAmount={1}
		content={
			<div className="flex flex-col items-stretch gap-2 px-1 py-3">
				<SkeletonAdminUserCard />
				<Divider />
				<SkeletonAdminUserCard />
				<SkeletonAdminUserCard />
				<SkeletonAdminUserCard />
			</div>
		}
	/>,
);

export const AdminScreen: React.FC = () => {
	const { t } = useTranslation("admin");
	return (
		<>
			<PageHeader>{t("pageHeader")}</PageHeader>
			<div>
				<AdminScreenInner />
			</div>
		</>
	);
};
