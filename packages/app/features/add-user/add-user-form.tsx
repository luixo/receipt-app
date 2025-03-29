import type React from "react";

import { z } from "zod";

import { useTrpcMutationOptions } from "~app/hooks/use-trpc-mutation-options";
import type { TRPCMutationOutput } from "~app/trpc";
import { trpc } from "~app/trpc";
import { useAppForm } from "~app/utils/forms";
import { emailSchema, userNameSchema } from "~app/utils/validation";
import { Button } from "~components/button";
import { options as usersAddOptions } from "~mutations/users/add";

const formSchema = z.object({
	name: userNameSchema,
	email: emailSchema.optional().or(z.literal("")),
});
type Form = z.infer<typeof formSchema>;

type Props = {
	initialValue?: string;
	onSuccess?: (response: TRPCMutationOutput<"users.add">) => void;
};

export const AddUserForm: React.FC<Props> = ({ initialValue, onSuccess }) => {
	const addUserMutation = trpc.users.add.useMutation(
		useTrpcMutationOptions(usersAddOptions, {
			onSuccess,
		}),
	);

	const defaultValues: Partial<Form> = {
		name: initialValue,
	};
	const form = useAppForm({
		defaultValues: defaultValues as Form,
		validators: { onChange: formSchema },
		onSubmit: ({ value }) => addUserMutation.mutate(value),
	});

	return (
		<form.AppForm>
			<form.Form className="flex flex-col gap-4">
				<form.AppField name="name">
					{(field) => (
						<field.TextField
							value={field.state.value}
							onValueChange={field.setValue}
							name={field.name}
							onBlur={field.handleBlur}
							label="User name"
							fieldError={field.state.meta.errors}
							mutation={addUserMutation}
						/>
					)}
				</form.AppField>
				<form.AppField name="email">
					{(field) => (
						<field.TextField
							value={field.state.value}
							onValueChange={field.setValue}
							name={field.name}
							onBlur={field.handleBlur}
							label="Email"
							fieldError={field.state.meta.errors}
							mutation={addUserMutation}
						/>
					)}
				</form.AppField>
				<form.Subscribe selector={(state) => state.canSubmit}>
					{(canSubmit) => (
						<Button
							color="primary"
							isDisabled={!canSubmit || addUserMutation.isPending}
							isLoading={addUserMutation.isPending}
							type="submit"
						>
							Add user
						</Button>
					)}
				</form.Subscribe>
			</form.Form>
		</form.AppForm>
	);
};
