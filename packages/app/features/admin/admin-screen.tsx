import React from "react";

import { useQuery } from "@tanstack/react-query";

import { User } from "~app/components/app/user";
import { QueryErrorMessage } from "~app/components/error-message";
import { PageHeader } from "~app/components/page-header";
import { StoreDataContext } from "~app/contexts/store-data-context";
import type { TRPCQueryOutput } from "~app/trpc";
import { PRETEND_USER_STORE_NAME } from "~app/utils/store/pretend-user";
import { useTRPC } from "~app/utils/trpc";
import { Button } from "~components/button";
import { Card, CardBody } from "~components/card";
import { Divider } from "~components/divider";
import { Header } from "~components/header";
import { Modal, ModalBody, ModalContent, ModalHeader } from "~components/modal";
import { Spinner } from "~components/spinner";
import { Tab, Tabs } from "~components/tabs";
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
	const becomeAccount = React.useCallback(() => {
		setMockedEmail(email);
		closeModal();
	}, [setMockedEmail, closeModal, email]);
	return (
		<Modal isOpen={isModalOpen} onOpenChange={closeModal}>
			<ModalContent>
				<ModalHeader>
					<Header>{`Do you want to become "${email}"?`}</Header>
				</ModalHeader>
				<ModalBody className="flex-row gap-4 p-4">
					<Button color="warning" onPress={becomeAccount} className="flex-1">
						Yes
					</Button>
					<Button color="default" onPress={closeModal} className="flex-1">
						No
					</Button>
				</ModalBody>
			</ModalContent>
		</Modal>
	);
};

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

const AdminScreenInner: React.FC = () => {
	const trpc = useTRPC();
	const accountQuery = useQuery(trpc.account.get.queryOptions());
	const accountsQuery = useQuery(trpc.admin.accounts.queryOptions());
	const [modalEmail, setModalEmail] = React.useState<string | undefined>();
	const {
		[PRETEND_USER_STORE_NAME]: [pretendUser, setPretendUser, resetPretendUser],
	} = React.useContext(StoreDataContext);
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
	switch (accountsQuery.status) {
		case "pending":
			return <Spinner size="md" />;
		case "error":
			return <QueryErrorMessage query={accountsQuery} />;
		case "success": {
			const pretendUserAccount = pretendUser.email
				? accountsQuery.data.find(
						(element) => element.account.email === pretendUser.email,
				  )
				: null;
			return (
				<Tabs variant="underlined">
					<Tab key="become" title="Pretend user">
						<div className="flex flex-col items-stretch gap-2">
							{pretendUserAccount ? (
								<>
									<AdminUserCard {...pretendUserAccount} />
									<Button onPress={resetPretendUser} color="primary">
										Reset to self
									</Button>
								</>
							) : accountQuery.data ? (
								<AdminUserCard
									user={{
										...accountQuery.data.user,
										// Typesystem doesn't know that we use account id as self user id;
										id: accountQuery.data.account.id as UsersId,
									}}
									account={accountQuery.data.account}
								/>
							) : null}
							<Divider />
							{accountsQuery.data
								.filter(
									(element) => pretendUser.email !== element.account.email,
								)
								.map((element) => (
									<AdminUserCard key={element.account.id} {...element}>
										<Button
											onPress={setModalEmailCurried(element.account.email)}
											color="warning"
										>
											Become
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
		}
	}
};

export const AdminScreen: React.FC = () => (
	<>
		<PageHeader>Admin panel</PageHeader>
		<AdminScreenInner />
	</>
);
