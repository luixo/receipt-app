import React from "react";

import { useMutation } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";

import { ErrorMessage } from "~app/components/error-message";
import { useTrpcMutationOptions } from "~app/hooks/use-trpc-mutation-options";
import { useTRPC } from "~app/utils/trpc";
import { Button } from "~components/button";
import { ButtonLink } from "~components/link";
import { Text } from "~components/text";
import { View } from "~components/view";
import { options as authVoidAccountOptions } from "~mutations/auth/void-account";

type Props = {
	token: string;
};

export const VoidAccount: React.FC<Props> = ({ token }) => {
	const { t } = useTranslation("void-account");
	const trpc = useTRPC();
	const voidMutation = useMutation(
		trpc.auth.voidAccount.mutationOptions(
			useTrpcMutationOptions(authVoidAccountOptions),
		),
	);
	const voidAccount = React.useCallback(
		() => voidMutation.mutate({ token }),
		[voidMutation, token],
	);
	if (voidMutation.status === "success") {
		return (
			<>
				<Text variant="h3">{voidMutation.data.email}</Text>
				<Text variant="h4" className="text-success">
					{t("success.message")}
				</Text>
				<ButtonLink color="primary" to="/login">
					{t("success.toLogin")}
				</ButtonLink>
			</>
		);
	}
	const { isPending } = voidMutation;
	return (
		<>
			<Text variant="h3">{t("confirmation.question")}</Text>
			<View className="flex-row gap-2">
				<Button
					className="flex-1"
					onPress={voidAccount}
					isDisabled={isPending}
					isLoading={isPending}
					color="danger"
					type="submit"
				>
					{t("confirmation.yes")}
				</Button>
				<ButtonLink
					className="flex-1"
					to="/login"
					color="primary"
					isDisabled={isPending}
				>
					{t("confirmation.no")}
				</ButtonLink>
			</View>
			{voidMutation.status === "error" ? (
				<ErrorMessage message={voidMutation.error.message} />
			) : null}
		</>
	);
};
