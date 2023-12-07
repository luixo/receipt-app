import React from "react";

import { zodResolver } from "@hookform/resolvers/zod";
import {
	Button,
	Input,
	Modal,
	ModalBody,
	ModalContent,
	ModalHeader,
} from "@nextui-org/react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Header } from "app/components/base/header";
import { Text } from "app/components/base/text";
import { useTrpcMutationOptions } from "app/hooks/use-trpc-mutation-options";
import { mutations } from "app/mutations";
import { trpc } from "app/trpc";
import { emailSchema } from "app/utils/validation";

type ResetPasswordForm = {
	email: string;
};

type Props = {
	isModalOpen: boolean;
	switchModalOpen: () => void;
};

export const ResetPasswordModal: React.FC<Props> = ({
	isModalOpen,
	switchModalOpen,
}) => {
	const form = useForm<ResetPasswordForm>({
		mode: "onChange",
		resolver: zodResolver(z.object({ email: emailSchema })),
	});

	const resetPasswordMutation = trpc.resetPasswordIntentions.add.useMutation(
		useTrpcMutationOptions(mutations.resetPasswordIntentions.add.options),
	);
	const onSubmit = React.useCallback(
		(data: ResetPasswordForm) => resetPasswordMutation.mutate(data),
		[resetPasswordMutation],
	);

	return (
		<Modal isOpen={isModalOpen} onOpenChange={switchModalOpen}>
			<ModalContent>
				<ModalHeader>
					<Header>Forgot password</Header>
				</ModalHeader>
				<ModalBody>
					{resetPasswordMutation.status === "success" ? (
						<Text>Reset password link was sent to {form.watch("email")}</Text>
					) : (
						<>
							<Input
								{...form.register("email")}
								label="Email"
								labelPlacement="outside"
								isInvalid={Boolean(form.formState.errors.email)}
								errorMessage={form.formState.errors.email?.message}
								isDisabled={resetPasswordMutation.isLoading}
							/>
							<Button
								color="primary"
								isDisabled={
									!form.formState.isValid || resetPasswordMutation.isLoading
								}
								isLoading={resetPasswordMutation.isLoading}
								onClick={form.handleSubmit(onSubmit)}
							>
								Send email
							</Button>
						</>
					)}
				</ModalBody>
			</ModalContent>
		</Modal>
	);
};
