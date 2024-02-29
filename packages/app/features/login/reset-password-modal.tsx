import React from "react";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { useTrpcMutationOptions } from "~app/hooks/use-trpc-mutation-options";
import { trpc } from "~app/trpc";
import { emailSchema } from "~app/utils/validation";
import {
	Button,
	Header,
	Input,
	Modal,
	ModalBody,
	ModalContent,
	ModalHeader,
	Text,
} from "~components";
import * as mutations from "~mutations";

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
				<ModalBody className="gap-4">
					{resetPasswordMutation.status === "success" ? (
						<Text>Reset password link was sent to {form.watch("email")}</Text>
					) : (
						<>
							<Input
								{...form.register("email")}
								label="Email"
								fieldError={form.formState.errors.email}
								isDisabled={resetPasswordMutation.isPending}
							/>
							<Button
								color="primary"
								isDisabled={
									!form.formState.isValid || resetPasswordMutation.isPending
								}
								isLoading={resetPasswordMutation.isPending}
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
