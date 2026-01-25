import type React from "react";

import { useMutation } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { z } from "zod";

import { useTrpcMutationOptions } from "~app/hooks/use-trpc-mutation-options";
import type { TRPCMutationResult } from "~app/trpc";
import { useAppForm } from "~app/utils/forms";
import { useTRPC } from "~app/utils/trpc";
import { emailSchema } from "~app/utils/validation";
import { Button } from "~components/button";
import { Modal } from "~components/modal";
import { Text } from "~components/text";
import { options as resetPasswordIntentionsAddOptions } from "~mutations/reset-password-intentions/add";

const formSchema = z.object({ email: emailSchema });

type Form = z.infer<typeof formSchema>;

const ResetPasswordModalForm: React.FC<{
	mutation: TRPCMutationResult<"resetPasswordIntentions.add">;
}> = ({ mutation }) => {
	const { t } = useTranslation("login");
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
							label={t("forgotPassword.modal.form.email.label")}
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
							{t("forgotPassword.modal.form.submit")}
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
	const { t } = useTranslation("login");
	const trpc = useTRPC();
	const resetPasswordMutation = useMutation(
		trpc.resetPasswordIntentions.add.mutationOptions(
			useTrpcMutationOptions(resetPasswordIntentionsAddOptions),
		),
	);
	return (
		<Modal
			isOpen={isModalOpen}
			onOpenChange={switchModalOpen}
			header={<Text variant="h3">{t("forgotPassword.modal.header")}</Text>}
		>
			{resetPasswordMutation.status === "success" ? (
				<Text>
					{t("forgotPassword.modal.success", {
						email: resetPasswordMutation.variables.email,
					})}
				</Text>
			) : (
				<ResetPasswordModalForm mutation={resetPasswordMutation} />
			)}
		</Modal>
	);
};
