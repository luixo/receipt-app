import React from "react";

import { useMutation, useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { z } from "zod";

import { useTrpcMutationOptions } from "~app/hooks/use-trpc-mutation-options";
import type { TRPCQueryOutput } from "~app/trpc";
import { useAppForm } from "~app/utils/forms";
import { useTRPC } from "~app/utils/trpc";
import { emailSchema } from "~app/utils/validation";
import { Button } from "~components/button";
import { LinkIcon, TrashBinIcon, UnlinkIcon } from "~components/icons";
import { Input } from "~components/input";
import { Spinner } from "~components/spinner";
import type { AccountsId } from "~db/models";
import { options as accountConnectionsAddOptions } from "~mutations/account-connection-intentions/add";
import { options as accountConnectionsRemoveOptions } from "~mutations/account-connection-intentions/remove";
import { options as usersUnlinkOptions } from "~mutations/users/unlink";

type Props = {
	user: TRPCQueryOutput<"users.get">;
	isLoading: boolean;
};

export const UserConnectionInput: React.FC<Props> = ({ user, isLoading }) => {
	const { t } = useTranslation("users");
	const trpc = useTRPC();
	const connectionIntentionsQuery = useQuery(
		trpc.accountConnectionIntentions.getAll.queryOptions(),
	);
	const outboundConnectionIntention =
		connectionIntentionsQuery.status === "success"
			? (connectionIntentionsQuery.data.outbound.find(
					(element) => element.user.id === user.id,
				) ?? null)
			: undefined;

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
		(accountId: AccountsId) =>
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

	if (outboundConnectionIntention === undefined) {
		if (connectionIntentionsQuery.status === "pending") {
			return <Spinner />;
		}
		if (connectionIntentionsQuery.status === "error") {
			return (
				<Button
					color="danger"
					onPress={() => connectionIntentionsQuery.refetch()}
				>
					{connectionIntentionsQuery.error.message}
				</Button>
			);
		}
		return null;
	}

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
						<TrashBinIcon size={24} />
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
										<UnlinkIcon size={24} />
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
										<LinkIcon size={24} />
									</Button>
								)
							}
						</form.Subscribe>
					}
				/>
			)}
		</form.AppField>
	);
};
