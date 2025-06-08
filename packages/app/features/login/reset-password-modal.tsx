import type React from "react";

import { z } from "zod/v4";

import { useTrpcMutationOptions } from "~app/hooks/use-trpc-mutation-options";
import type { TRPCMutationResult } from "~app/trpc";
import { trpc } from "~app/trpc";
import { useAppForm } from "~app/utils/forms";
import { emailSchema } from "~app/utils/validation";
import { Button } from "~components/button";
import { Header } from "~components/header";
import { Modal, ModalBody, ModalContent, ModalHeader } from "~components/modal";
import { Text } from "~components/text";
import { options as resetPasswordIntentionsAddOptions } from "~mutations/reset-password-intentions/add";

const formSchema = z.object({ email: emailSchema });

type Form = z.infer<typeof formSchema>;

const ResetPasswordModalForm: React.FC<{
	mutation: TRPCMutationResult<"resetPasswordIntentions.add">;
}> = ({ mutation }) => {
	const defaultValues: Partial<Form> = {};
	const form = useAppForm({
		defaultValues: defaultValues as Form,
		validators: {
			onMount: formSchema,
			onChange: formSchema,
			onSubmit: formSchema,
		},
		onSubmit: ({ value }) => mutation.mutate(value),
	});

	return (
		<form.AppForm>
			<form.Form className="flex flex-col gap-4">
				<form.AppField name="email">
					{(field) => (
						<field.TextField
							value={field.state.value}
							onValueChange={field.setValue}
							name={field.name}
							onBlur={field.handleBlur}
							label="Email"
							fieldError={
								field.state.meta.isDirty ? field.state.meta.errors : undefined
							}
							mutation={mutation}
						/>
					)}
				</form.AppField>
				<form.Subscribe selector={(state) => state.canSubmit}>
					{(canSubmit) => (
						<Button
							color="primary"
							isDisabled={!canSubmit || mutation.isPending}
							isLoading={mutation.isPending}
							type="submit"
						>
							Send email
						</Button>
					)}
				</form.Subscribe>
			</form.Form>
		</form.AppForm>
	);
};

type Props = {
	isModalOpen: boolean;
	switchModalOpen: () => void;
};

export const ResetPasswordModal: React.FC<Props> = ({
	isModalOpen,
	switchModalOpen,
}) => {
	const resetPasswordMutation = trpc.resetPasswordIntentions.add.useMutation(
		useTrpcMutationOptions(resetPasswordIntentionsAddOptions),
	);
	return (
		<Modal isOpen={isModalOpen} onOpenChange={switchModalOpen}>
			<ModalContent>
				<ModalHeader>
					<Header>Forgot password</Header>
				</ModalHeader>
				<ModalBody>
					{resetPasswordMutation.status === "success" ? (
						<Text>
							Reset password link was sent to{" "}
							{resetPasswordMutation.variables.email}
						</Text>
					) : (
						<ResetPasswordModalForm mutation={resetPasswordMutation} />
					)}
				</ModalBody>
			</ModalContent>
		</Modal>
	);
};
