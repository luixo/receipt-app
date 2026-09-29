import type React from "react";

import { useMutation } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { z } from "zod";

import { useTrpcMutationOptions } from "#app/hooks/use-trpc-mutation-options.ts";
import type { TRPCMutationOutput } from "#app/trpc.ts";
import { useAppForm } from "#app/utils/forms.tsx";
import { useTRPC } from "#app/utils/trpc.ts";
import { emailSchema, peerNameSchema } from "#app/utils/validation.ts";
import { Button } from "#components/button.tsx";
import { options as peersAddOptions } from "#mutations/peers/add.ts";

const formSchema = z.object({
	name: peerNameSchema,
	email: emailSchema.optional().or(z.literal("")),
});
type Form = z.infer<typeof formSchema>;

type Props = {
	initialValue?: string;
	onSuccess?: (response: TRPCMutationOutput<"peers.add">) => void;
};

export const AddPeerForm: React.FC<Props> = ({ initialValue, onSuccess }) => {
	const { t } = useTranslation("peers");
	const trpc = useTRPC();
	const addPeerMutation = useMutation(
		trpc.peers.add.mutationOptions(
			useTrpcMutationOptions(peersAddOptions, {
				onSuccess,
			}),
		),
	);

	const defaultValues: Partial<Form> = {
		name: initialValue,
	};
	const form = useAppForm({
		defaultValues: defaultValues as Form,
		validators: {
			onMount: formSchema,
			onChange: formSchema,
			onSubmit: formSchema,
		},
		onSubmit: ({ value }) => addPeerMutation.mutate(value),
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
							label={t("add.form.name.label")}
							fieldError={
								field.state.meta.isDirty ? field.state.meta.errors : undefined
							}
							mutation={addPeerMutation}
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
							label={t("add.form.email.label")}
							fieldError={
								field.state.meta.isDirty ? field.state.meta.errors : undefined
							}
							mutation={addPeerMutation}
						/>
					)}
				</form.AppField>
				<form.Subscribe selector={(state) => state.canSubmit}>
					{(canSubmit) => (
						<Button
							color="primary"
							isDisabled={!canSubmit || addPeerMutation.isPending}
							isLoading={addPeerMutation.isPending}
							type="submit"
						>
							{t("add.form.submit")}
						</Button>
					)}
				</form.Subscribe>
			</form.Form>
		</form.AppForm>
	);
};
