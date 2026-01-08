import React from "react";

import { useMutation, useSuspenseQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { z } from "zod";

import { suspendedFallback } from "~app/components/suspense-wrapper";
import { useTrpcMutationOptions } from "~app/hooks/use-trpc-mutation-options";
import { useAppForm } from "~app/utils/forms";
import { useTRPC } from "~app/utils/trpc";
import { emailSchema } from "~app/utils/validation";
import { Button } from "~components/button";
import { Icon } from "~components/icons";
import { Input, SkeletonInput } from "~components/input";
import type { AccountId, UserId } from "~db/ids";
import { options as accountConnectionsAddOptions } from "~mutations/account-connection-intentions/add";
import { options as accountConnectionsRemoveOptions } from "~mutations/account-connection-intentions/remove";
import { options as usersUnlinkOptions } from "~mutations/users/unlink";

type Props = {
	id: UserId;
	isLoading: boolean;
};

export const UserConnectionInput: React.FC<Props> = suspendedFallback(
	({ isLoading, id }) => {
		const { t } = useTranslation("users");
		const trpc = useTRPC();
		const { data: user } = useSuspenseQuery(
			trpc.users.get.queryOptions({ id }),
		);
		const { data: connectionIntentions } = useSuspenseQuery(
			trpc.accountConnectionIntentions.getAll.queryOptions(),
		);
		const outboundConnectionIntention =
			connectionIntentions.outbound.find(
				(element) => element.user.id === user.id,
			) ?? null;

		const connectUserMutation = useMutation(
			trpc.accountConnectionIntentions.add.mutationOptions(
				useTrpcMutationOptions(accountConnectionsAddOptions),
			),
		);

		const form = useAppForm({
			defaultValues: { value: user.connectedAccount?.email ?? "" },
			validators: { onChange: z.object({ value: emailSchema }) },
			onSubmit: ({ value }) => {
				connectUserMutation.mutate({
					userId: user.id,
					email: value.value,
				});
			},
		});
		const [inputShown, setInputShown] = React.useState(
			Boolean(user.connectedAccount),
		);

		const cancelRequestMutation = useMutation(
			trpc.accountConnectionIntentions.remove.mutationOptions(
				useTrpcMutationOptions(accountConnectionsRemoveOptions, {
					onSuccess: () => {
						form.reset();
						setInputShown(false);
					},
				}),
			),
		);
		const cancelRequest = React.useCallback(
			(accountId: AccountId) =>
				cancelRequestMutation.mutate({ targetAccountId: accountId }),
			[cancelRequestMutation],
		);

		const unlinkMutation = useMutation(
			trpc.users.unlink.mutationOptions(
				useTrpcMutationOptions(usersUnlinkOptions),
			),
		);
		const unlinkUser = React.useCallback(
			() => unlinkMutation.mutate({ id: user.id }),
			[unlinkMutation, user.id],
		);

		if (outboundConnectionIntention) {
			return (
				<Input
					label={t("user.connection.outbound.label")}
					value={outboundConnectionIntention.account.email}
					isReadOnly
					mutation={cancelRequestMutation}
					endContent={
						<Button
							title={t("user.connection.cancel.title")}
							variant="light"
							isLoading={cancelRequestMutation.isPending}
							color="danger"
							isIconOnly
							onPress={() =>
								cancelRequest(outboundConnectionIntention.account.id)
							}
						>
							<Icon name="trash" className="size-6" />
						</Button>
					}
				/>
			);
		}

		if (!inputShown) {
			return (
				<Button
					color="primary"
					onPress={() => setInputShown(true)}
					isDisabled={isLoading}
				>
					{t("user.connection.connect")}
				</Button>
			);
		}

		return (
			<form.AppField name="value">
				{(field) => (
					<field.TextField
						value={field.state.value}
						onValueChange={field.setValue}
						name={field.name}
						onBlur={field.handleBlur}
						fieldError={
							field.state.meta.isDirty ? field.state.meta.errors : undefined
						}
						label={t("user.connection.email.label")}
						mutation={[connectUserMutation, unlinkMutation]}
						isDisabled={isLoading}
						isReadOnly={Boolean(user.connectedAccount)}
						endContent={
							<form.Subscribe selector={(state) => state.canSubmit}>
								{(canSubmit) =>
									user.connectedAccount ? (
										<Button
											title={t("user.connection.unlink.title")}
											variant="light"
											isLoading={unlinkMutation.isPending}
											isIconOnly
											onPress={unlinkUser}
										>
											<Icon name="unlink" className="size-6" />
										</Button>
									) : (
										<Button
											title={t("user.connection.link.title")}
											variant="light"
											isLoading={connectUserMutation.isPending}
											isDisabled={!canSubmit}
											onPress={() => {
												void field.form.handleSubmit();
											}}
											isIconOnly
										>
											<Icon name="link" className="size-6" />
										</Button>
									)
								}
							</form.Subscribe>
						}
					/>
				)}
			</form.AppField>
		);
	},
	() => {
		const { t } = useTranslation("users");
		return <SkeletonInput label={t("user.connection.email.label")} />;
	},
);
