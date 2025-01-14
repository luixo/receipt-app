import React from "react";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { useTrpcMutationOptions } from "~app/hooks/use-trpc-mutation-options";
import { trpc } from "~app/trpc";
import { emailSchema } from "~app/utils/validation";
import { Button } from "~components/button";
import { Header } from "~components/header";
import { Input } from "~components/input";
import { Modal, ModalBody, ModalContent, ModalHeader } from "~components/modal";
import { Text } from "~components/text";
import { options as resetPasswordIntentionsAddOptions } from "~mutations/reset-password-intentions/add";

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
		useTrpcMutationOptions(resetPasswordIntentionsAddOptions),
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
						<form
							onSubmit={form.handleSubmit(onSubmit)}
							className="flex flex-col gap-4"
						>
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
								type="submit"
							>
								Send email
							</Button>
						</form>
					)}
				</ModalBody>
			</ModalContent>
		</Modal>
	);
};
