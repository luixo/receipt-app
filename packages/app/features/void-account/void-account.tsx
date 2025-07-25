import React from "react";
import { View } from "react-native";

import { useMutation } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";

import { ErrorMessage } from "~app/components/error-message";
import { useTrpcMutationOptions } from "~app/hooks/use-trpc-mutation-options";
import { useTRPC } from "~app/utils/trpc";
import { Button } from "~components/button";
import { Header } from "~components/header";
import { ButtonLink } from "~components/link";
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
				<Header>{voidMutation.data.email}</Header>
				<Header size="sm" className="text-success">
					{t("success.message")}
				</Header>
				<ButtonLink color="primary" to="/login">
					{t("success.toLogin")}
				</ButtonLink>
			</>
		);
	}
	const { isPending } = voidMutation;
	return (
		<>
			<Header>{t("confirmation.question")}</Header>
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
