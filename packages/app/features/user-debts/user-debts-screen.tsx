import React from "react";
import { View } from "react-native";

import { LoadableUser } from "~app/components/app/loadable-user";
import { PageHeader } from "~app/components/page-header";
import { User } from "~app/features/user/user";
import { useBooleanState } from "~app/hooks/use-boolean-state";
import { useNavigate } from "~app/hooks/use-navigation";
import { Button } from "~components/button";
import { AddIcon, PencilIcon, TransferIcon } from "~components/icons";
import { BackLink, ButtonLink } from "~components/link";
import { Modal, ModalBody, ModalContent, ModalHeader } from "~components/modal";
import { Text } from "~components/text";
import type { UsersId } from "~db/models";

import { UserDebtsGroup } from "./user-debts-group";
import { UserDebtsList } from "./user-debts-list";

type HeaderProps = {
	userId: UsersId;
};

const Header: React.FC<HeaderProps> = ({ userId }) => {
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
							<PencilIcon size={32} />
						</Button>
						<ButtonLink
							to="/debts/transfer"
							search={{ from: userId }}
							color="primary"
							title="Transfer debts"
							variant="bordered"
							isIconOnly
						>
							<TransferIcon size={24} />
						</ButtonLink>
						<ButtonLink
							color="primary"
							to="/debts/add"
							search={{ userId }}
							title="Add debt"
							variant="bordered"
							isIconOnly
						>
							<AddIcon size={24} />
						</ButtonLink>
					</View>
				}
			>
				<LoadableUser id={userId} />
			</PageHeader>

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

export const UserDebtsScreen: React.FC<{ userId: UsersId }> = ({ userId }) => (
	<>
		<Header userId={userId} />
		<UserDebtsGroup userId={userId} />
		<UserDebtsList userId={userId} />
	</>
);
