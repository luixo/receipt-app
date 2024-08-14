import React from "react";

import { User } from "~app/components/app/user";
import { QueryErrorMessage } from "~app/components/error-message";
import { PageHeader } from "~app/components/page-header";
import { SSRContext } from "~app/contexts/ssr-context";
import type { TRPCQueryOutput } from "~app/trpc";
import { trpc } from "~app/trpc";
import { PRETEND_USER_COOKIE_NAME } from "~app/utils/cookie/pretend-user";
import {
	Button,
	Card,
	CardBody,
	Divider,
	Header,
	Modal,
	ModalBody,
	ModalContent,
	ModalHeader,
	Spinner,
	Tab,
	Tabs,
} from "~components";
import type { UsersId } from "~db";
import type { AppPage } from "~utils/next";

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
					<Button color="warning" onClick={becomeAccount} className="flex-1">
						Yes
					</Button>
					<Button color="default" onClick={closeModal} className="flex-1">
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
				foreign={!user}
			/>
			<div>{children}</div>
		</CardBody>
	</Card>
);

export const AdminScreen: AppPage = () => {
	const accountQuery = trpc.account.get.useQuery();
	const accountsQuery = trpc.admin.accounts.useQuery();
	const [modalEmail, setModalEmail] = React.useState<string | undefined>();
	const {
		[PRETEND_USER_COOKIE_NAME]: [pretendUser, setPretendUser, resetPretendUser],
	} = React.useContext(SSRContext);
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
	if (accountsQuery.status === "pending") {
		return <Spinner size="md" />;
	}
	if (accountsQuery.status === "error") {
		return <QueryErrorMessage query={accountsQuery} />;
	}
	const pretendUserAccount = pretendUser.email
		? accountsQuery.data.find(
				(element) => element.account.email === pretendUser.email,
		  )
		: null;
	return (
		<>
			<PageHeader>Admin panel</PageHeader>
			<Tabs variant="underlined">
				<Tab key="become" title="Pretend user">
					<div className="flex flex-col items-stretch gap-2">
						{pretendUserAccount ? (
							<>
								<AdminUserCard {...pretendUserAccount} />
								<Button onClick={resetPretendUser} color="primary">
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
							.filter((element) => pretendUser.email !== element.account.email)
							.map((element) => (
								<AdminUserCard key={element.account.id} {...element}>
									<Button
										onClick={setModalEmailCurried(element.account.email)}
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
		</>
	);
};
