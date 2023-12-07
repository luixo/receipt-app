import React from "react";

import { zodResolver } from "@hookform/resolvers/zod";
import { Input, Modal, Spacer, Text } from "@nextui-org/react";
import { Button } from "@nextui-org/react-tailwind";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { useTrpcMutationOptions } from "app/hooks/use-trpc-mutation-options";
import { mutations } from "app/mutations";
import { trpc } from "app/trpc";
import { emailSchema } from "app/utils/validation";

type ResetPasswordForm = {
	email: string;
};

type Props = {
	isModalOpen: boolean;
	closeModal: () => void;
};

export const ResetPasswordModal: React.FC<Props> = ({
	isModalOpen,
	closeModal,
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
		<Modal open={isModalOpen} onClose={closeModal}>
			<Modal.Header>
				<Text h2>Forgot password</Text>
			</Modal.Header>
			<Modal.Body>
				{resetPasswordMutation.status === "success" ? (
					<Text>Reset password link was sent to {form.watch("email")}</Text>
				) : (
					<>
						<Input
							{...form.register("email")}
							label="Email"
							helperColor="warning"
							helperText={form.formState.errors.email?.message}
							disabled={resetPasswordMutation.isLoading}
						/>
						<Spacer y={0.25} />
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
				<Spacer y={1} />
			</Modal.Body>
		</Modal>
	);
};
