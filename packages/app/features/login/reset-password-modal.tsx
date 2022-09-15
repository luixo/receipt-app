import React from "react";

import { zodResolver } from "@hookform/resolvers/zod";
import { Button, Input, Loading, Modal, Spacer, Text } from "@nextui-org/react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { MutationErrorMessage } from "app/components/error-message";
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

	const resetPasswordMutation = trpc.resetPasswordIntentions.add.useMutation();
	const onSubmit = React.useCallback(
		(data: ResetPasswordForm) => resetPasswordMutation.mutate(data),
		[resetPasswordMutation]
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
							disabled={
								!form.formState.isValid || resetPasswordMutation.isLoading
							}
							onClick={form.handleSubmit(onSubmit)}
						>
							{resetPasswordMutation.isLoading ? <Loading /> : "Send email"}
						</Button>
						{resetPasswordMutation.status === "error" ? (
							<>
								<Spacer y={1} />
								<MutationErrorMessage mutation={resetPasswordMutation} />
							</>
						) : null}
					</>
				)}
				<Spacer y={1} />
			</Modal.Body>
		</Modal>
	);
};
