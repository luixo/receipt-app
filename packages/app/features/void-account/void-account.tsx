import React from "react";
import { View } from "react-native";

import { ErrorMessage } from "~app/components/error-message";
import { useTrpcMutationOptions } from "~app/hooks/use-trpc-mutation-options";
import { trpc } from "~app/trpc";
import { Button } from "~components/button";
import { Header } from "~components/header";
import { ButtonLink } from "~components/link";
import { options as authVoidAccountOptions } from "~mutations/auth/void-account";

type Props = {
	token: string;
};

export const VoidAccount: React.FC<Props> = ({ token }) => {
	const voidMutation = trpc.auth.voidAccount.useMutation(
		useTrpcMutationOptions(authVoidAccountOptions),
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
					Account removed succesfully
				</Header>
				<ButtonLink color="primary" to="/login">
					To login page
				</ButtonLink>
			</>
		);
	}
	const { isPending } = voidMutation;
	return (
		<>
			<Header>Are you sure you want to void your account?</Header>
			<View className="flex-row gap-2">
				<Button
					className="flex-1"
					onPress={voidAccount}
					isDisabled={isPending}
					isLoading={isPending}
					color="danger"
					type="submit"
				>
					Yes
				</Button>
				<ButtonLink
					className="flex-1"
					to="/login"
					color="primary"
					isDisabled={isPending}
				>
					No
				</ButtonLink>
			</View>
			{voidMutation.status === "error" ? (
				<ErrorMessage message={voidMutation.error.message} />
			) : null}
		</>
	);
};
